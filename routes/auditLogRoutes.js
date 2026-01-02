const express = require('express');
const router = express.Router();
const auditLogController = require('../controllers/auditLogController');
const auth = require('../middleware/auth');

// Admins and Administrative can see logs
const adminAuth = (req, res, next) => {
    if (req.user && (req.user.role === 'ADMIN' || req.user.role === 'ADMINISTRATIVE')) {
        next();
    } else {
        res.status(403).json({ message: 'Access denied. Admin only.' });
    }
};

// Only ADMINISTRATIVE can delete logs
const administrativeOnly = (req, res, next) => {
    if (req.user && req.user.role === 'ADMINISTRATIVE') {
        next();
    } else {
        res.status(403).json({ message: 'Access denied. ADMINISTRATIVE only.' });
    }
};

router.get('/', auth, adminAuth, auditLogController.getLogs);
router.delete('/:id', auth, administrativeOnly, auditLogController.deleteLog);
router.delete('/', auth, administrativeOnly, auditLogController.deleteAllLogs);

module.exports = router;
