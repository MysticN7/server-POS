const User = require('../models/User');
const jwt = require('jsonwebtoken');
const { logAction } = require('./auditLogController');
const { PERMISSIONS_LIST } = require('./userController');

const ensurePermissions = (role, permissions = []) => {
    if (role === 'ADMINISTRATIVE') return PERMISSIONS_LIST;
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

        // Check user (by email or username)
        const user = await User.findOne({
            $or: [
                { email: email.toLowerCase() },
                { username: email }
            ]
        });

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
                role: user.role,
                permissions: ensurePermissions(user.role, user.permissions)
            }
        };

        jwt.sign(
            payload,
            process.env.JWT_SECRET,
            { expiresIn: '1d' },
            (err, token) => {
                if (err) throw err;

                // Log successful login
                logAction('LOGIN', `User ${user.name} logged in`, user._id, user._id, 'User', req.ip);

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

exports.getMe = async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-password');
        res.json(serializeUser(user));
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server Error' });
    }
};
