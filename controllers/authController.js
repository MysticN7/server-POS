const User = require('../models/User');
const jwt = require('jsonwebtoken');

const PERMISSIONS_LIST = [
    'DASHBOARD', 'POS', 'INVENTORY', 'EXPENSES', 'REPORTS', 'JOBCARDS', 'SETTINGS', 'USERS', 'BANK_BOOK', 'CASH_BOOK',
    'INVENTORY_VIEW', 'INVENTORY_CREATE', 'INVENTORY_UPDATE', 'INVENTORY_DELETE',
    'EXPENSES_VIEW', 'EXPENSES_CREATE', 'EXPENSES_UPDATE', 'EXPENSES_DELETE',
    'REPORTS_VIEW', 'REPORTS_FINANCIAL',
    'JOBCARDS_VIEW', 'JOBCARDS_CREATE', 'JOBCARDS_UPDATE', 'JOBCARDS_DELETE',
    'SETTINGS_VIEW', 'SETTINGS_UPDATE',
    'USERS_VIEW', 'USERS_CREATE', 'USERS_UPDATE', 'USERS_DELETE',
    'BANK_BOOK_VIEW', 'CASH_BOOK_VIEW'
];

const ensurePermissions = (role, permissions = []) => {
    if (role === 'ADMIN') return PERMISSIONS_LIST;
    if (!Array.isArray(permissions)) return [];
    return permissions.filter((perm) => PERMISSIONS_LIST.includes(perm));
};

const serializeUser = (user) => ({
    id: user._id,
    name: user.name || user.username,
    email: user.email,
    role: user.role,
    permissions: ensurePermissions(user.role, user.permissions)
});

exports.register = async (req, res) => {
    try {
        const { name, email, password, role = 'SALESPERSON', permissions = [] } = req.body;

        if (!email || !password) {
            return res.status(400).json({ message: 'Email and password are required' });
        }

        // Check if user exists
        let user = await User.findOne({ email });
        if (user) {
            return res.status(400).json({ message: 'User already exists' });
        }

        // Create user (password hashing is handled by the model's pre-save hook)
        user = new User({
            name: name || email.split('@')[0],
            username: req.body.username || name || email.split('@')[0],
            email,
            password,
            role,
            permissions: ensurePermissions(role, permissions)
        });

        await user.save();

        res.status(201).json({ message: 'User created successfully', userId: user._id });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Check user
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        // Check password (using model method)
        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        // Generate Token
        const payload = {
            user: {
                id: user._id,
                role: user.role
            }
        };

        jwt.sign(
            payload,
            process.env.JWT_SECRET,
            { expiresIn: '1d' },
            (err, token) => {
                if (err) throw err;
                res.json({
                    token,
                    user: serializeUser(user)
                });
            }
        );
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};
