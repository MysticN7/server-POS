const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const auth = require('../middleware/auth');

// Middleware to check if user is admin
const adminOnly = (req, res, next) => {
    if (req.user && (req.user.role === 'ADMIN' || req.user.role === 'ADMINISTRATIVE')) {
        next();
    } else {
        res.status(403).json({ message: 'Access denied. Admin only.' });
    }
};

router.get('/', auth, adminOnly, userController.getAllUsers);
router.post('/', auth, adminOnly, userController.createUser);
router.put('/:id', auth, adminOnly, userController.updateUser);
router.delete('/:id', auth, adminOnly, userController.deleteUser);
router.get('/permissions', auth, adminOnly, userController.getPermissionsCatalog);

module.exports = router;
