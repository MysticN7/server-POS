const User = require('../models/User');
const { logAction } = require('./auditLogController');

exports.PERMISSIONS_LIST = [
    // Core pages (backwards compatible)
    'DASHBOARD', 'POS', 'INVENTORY', 'EXPENSES', 'REPORTS', 'JOBCARDS', 'SETTINGS', 'USERS', 'BANK_BOOK', 'CASH_BOOK',
    // Granular actions
    'INVENTORY_VIEW', 'INVENTORY_CREATE', 'INVENTORY_UPDATE', 'INVENTORY_DELETE',
    'EXPENSES_VIEW', 'EXPENSES_CREATE', 'EXPENSES_UPDATE', 'EXPENSES_DELETE',
    'REPORTS_VIEW', 'REPORTS_FINANCIAL',
    'JOBCARDS_VIEW', 'JOBCARDS_CREATE', 'JOBCARDS_UPDATE', 'JOBCARDS_DELETE',
    'SETTINGS_VIEW', 'SETTINGS_UPDATE',
    'USERS_VIEW', 'USERS_CREATE', 'USERS_UPDATE', 'USERS_DELETE',
    'BANK_BOOK_VIEW', 'CASH_BOOK_VIEW',
    'VIEW_MONTHLY_SALES', 'DELETE_SALES', 'DUE_COLLECTION', 'EDIT_DUE', 'DELETE_DUE'
];

const PERMISSIONS_LIST = exports.PERMISSIONS_LIST;

const ensurePermissions = (role, permissions = []) => {
    // ADMINISTRATIVE gets all permissions
    if (role === 'ADMINISTRATIVE') return PERMISSIONS_LIST;

    // For all other roles (including ADMIN), validate against list
    if (!Array.isArray(permissions)) return [];
    return permissions.filter((perm) => PERMISSIONS_LIST.includes(perm));
};

const sanitizeUser = (userDoc, includePassword = false) => {
    const user = userDoc.toObject({ getters: true });
    const result = {
        id: user._id,
        name: user.name || user.username,
        email: user.email,
        role: user.role,
        permissions: ensurePermissions(user.role, user.permissions),
        status: user.status,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
    };
    // Include lastSetPassword only if requested (admin only)
    if (includePassword && user.lastSetPassword) {
        result.lastSetPassword = user.lastSetPassword;
    }
    return result;
};

exports.getAllUsers = async (req, res) => {
    try {
        const requesterRole = req.user?.role;
        const isAdministrative = requesterRole === 'ADMINISTRATIVE';

        let query = User.find().sort({ createdAt: -1 });

        // Only ADMINISTRATIVE can see passwords
        if (isAdministrative) {
            query = query.select('+lastSetPassword');
        }

        let users = await query;

        // Filter out ADMINISTRATIVE users for non-ADMINISTRATIVE requesters
        if (!isAdministrative) {
            users = users.filter(u => u.role !== 'ADMINISTRATIVE');
        }

        res.json(users.map(u => sanitizeUser(u, isAdministrative)));
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ message: error.message });
    }
};

exports.getUserById = async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        res.json(sanitizeUser(user));
    } catch (error) {
        console.error('Error fetching user:', error);
        res.status(500).json({ message: error.message });
    }
};

exports.createUser = async (req, res) => {
    try {
        const { name, email, password, role = 'SALESPERSON', permissions = [] } = req.body;

        if (!name || !password) {
            return res.status(400).json({ message: 'Name and password are required' });
        }

        const generatedEmail = email && email.trim() !== ''
            ? email
            : `${(req.body.username || name).toLowerCase().replace(/\s+/g, '.')}.${Date.now()}@local`;

        const user = new User({
            name,
            username: req.body.username || name,
            email: generatedEmail,
            password,
            role,
            permissions: ensurePermissions(role, permissions),
            status: req.body.status || 'ACTIVE'
        });

        await user.save();

        // Log action
        logAction('CREATE_USER', `Created user: ${user.name} (${user.role})`, req.user.id, user._id, 'User', req.ip);

        res.status(201).json(sanitizeUser(user));
    } catch (error) {
        console.error('Error creating user:', error);
        res.status(400).json({ message: error.message });
    }
};

exports.updateUser = async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const requesterRole = req.user?.role;

        // Only ADMINISTRATIVE can edit ADMINISTRATIVE users
        if (user.role === 'ADMINISTRATIVE' && requesterRole !== 'ADMINISTRATIVE') {
            return res.status(403).json({ message: 'Cannot edit ADMINISTRATIVE users' });
        }

        // Only ADMINISTRATIVE can set someone as ADMINISTRATIVE
        if (req.body.role === 'ADMINISTRATIVE' && requesterRole !== 'ADMINISTRATIVE') {
            return res.status(403).json({ message: 'Only ADMINISTRATIVE can assign ADMINISTRATIVE role' });
        }

        const { name, email, role, permissions, status, password } = req.body;

        if (name !== undefined) {
            user.name = name;
            user.username = req.body.username || name;
        }

        if (email !== undefined) {
            user.email = email;
        }

        if (role !== undefined) {
            user.role = role;
            user.permissions = ensurePermissions(role, permissions ?? user.permissions);
        } else if (permissions !== undefined) {
            user.permissions = ensurePermissions(user.role, permissions);
        }

        if (status !== undefined) {
            user.status = status;
        }

        if (password) {
            user.password = password;
        }

        await user.save();

        // Log action
        logAction('UPDATE_USER', `Updated user: ${user.name}`, req.user.id, user._id, 'User', req.ip);

        res.json(sanitizeUser(user));
    } catch (error) {
        console.error('Error updating user:', error);
        res.status(400).json({ message: error.message });
    }
};

exports.getPermissionsCatalog = async (req, res) => {
    // Group permissions for better UI presentation
    const groups = {
        Core: ['DASHBOARD', 'POS', 'INVENTORY', 'EXPENSES', 'REPORTS', 'JOBCARDS', 'SETTINGS', 'USERS'],
        Inventory: ['INVENTORY_VIEW', 'INVENTORY_CREATE', 'INVENTORY_UPDATE', 'INVENTORY_DELETE'],
        Expenses: ['EXPENSES_VIEW', 'EXPENSES_CREATE', 'EXPENSES_UPDATE', 'EXPENSES_DELETE'],
        Reports: ['REPORTS_VIEW', 'REPORTS_FINANCIAL', 'BANK_BOOK', 'CASH_BOOK', 'BANK_BOOK_VIEW', 'CASH_BOOK_VIEW'],
        JobCards: ['JOBCARDS_VIEW', 'JOBCARDS_CREATE', 'JOBCARDS_UPDATE', 'JOBCARDS_DELETE'],
        Settings: ['SETTINGS_VIEW', 'SETTINGS_UPDATE'],
        Users: ['USERS_VIEW', 'USERS_CREATE', 'USERS_UPDATE', 'USERS_DELETE'],
        Sales: ['VIEW_MONTHLY_SALES', 'DELETE_SALES', 'DUE_COLLECTION', 'EDIT_DUE', 'DELETE_DUE']
    };
    res.json({ list: PERMISSIONS_LIST, groups });
};

exports.deleteUser = async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Only ADMINISTRATIVE can delete ADMINISTRATIVE users
        if (user.role === 'ADMINISTRATIVE' && req.user?.role !== 'ADMINISTRATIVE') {
            return res.status(403).json({ message: 'Cannot delete ADMINISTRATIVE users' });
        }

        await User.findByIdAndDelete(req.params.id);
        res.json({ message: 'User deleted successfully' });

        // Log action
        logAction('DELETE_USER', `Deleted user: ${user.name}`, req.user.id, req.params.id, 'User', req.ip);
    } catch (error) {
        console.error('Error deleting user:', error);
        res.status(500).json({ message: error.message });
    }
};
