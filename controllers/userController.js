const User = require('../models/User');

const PERMISSIONS_LIST = ['DASHBOARD', 'POS', 'INVENTORY', 'EXPENSES', 'REPORTS', 'JOBCARDS', 'SETTINGS', 'USERS'];

const ensurePermissions = (role, permissions = []) => {
    if (role === 'ADMIN') return PERMISSIONS_LIST;
    if (!Array.isArray(permissions)) return [];
    return permissions.filter((perm) => PERMISSIONS_LIST.includes(perm));
};

const sanitizeUser = (userDoc) => {
    const user = userDoc.toObject({ getters: true });
    return {
        id: user._id,
        name: user.name || user.username,
        email: user.email,
        role: user.role,
        permissions: ensurePermissions(user.role, user.permissions),
        status: user.status,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
    };
};

exports.getAllUsers = async (req, res) => {
    try {
        const users = await User.find().sort({ createdAt: -1 });
        res.json(users.map(sanitizeUser));
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
        res.json(sanitizeUser(user));
    } catch (error) {
        console.error('Error updating user:', error);
        res.status(400).json({ message: error.message });
    }
};

exports.deleteUser = async (req, res) => {
    try {
        const user = await User.findByIdAndDelete(req.params.id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        res.json({ message: 'User deleted successfully' });
    } catch (error) {
        console.error('Error deleting user:', error);
        res.status(500).json({ message: error.message });
    }
};
