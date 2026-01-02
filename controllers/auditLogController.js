const AuditLog = require('../models/AuditLog');

// Internal function to log actions
exports.logAction = async (action, details, userId, entityId = null, entityType = null, ipAddress = null) => {
    try {
        await AuditLog.create({
            action,
            details,
            performedBy: userId,
            entityId,
            entityType,
            ipAddress
        });
    } catch (error) {
        console.error('Error creating audit log:', error);
        // Don't throw error to prevent blocking main flow
    }
};

// Get logs with pagination and filtering
exports.getLogs = async (req, res) => {
    try {
        const { page = 1, limit = 20, action, userId, startDate, endDate } = req.query;
        const query = {};

        if (action) {
            query.action = { $regex: action, $options: 'i' };
        }

        if (userId) {
            query.performedBy = userId;
        }

        if (startDate || endDate) {
            query.createdAt = {};
            if (startDate) query.createdAt.$gte = new Date(startDate);
            if (endDate) query.createdAt.$lte = new Date(new Date(endDate).setHours(23, 59, 59, 999));
        }

        const logs = await AuditLog.find(query)
            .populate('performedBy', 'name email role')
            .sort({ createdAt: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit)
            .exec();

        const count = await AuditLog.countDocuments(query);

        res.json({
            logs,
            totalPages: Math.ceil(count / limit),
            currentPage: page,
            totalLogs: count
        });
    } catch (error) {
        console.error('Error fetching audit logs:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// Delete audit log (ADMINISTRATIVE only - checked at route level)
exports.deleteLog = async (req, res) => {
    try {
        const log = await AuditLog.findByIdAndDelete(req.params.id);
        if (!log) {
            return res.status(404).json({ message: 'Audit log not found' });
        }
        res.json({ message: 'Audit log deleted successfully' });
    } catch (error) {
        console.error('Error deleting audit log:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// Delete all audit logs (ADMINISTRATIVE only)
exports.deleteAllLogs = async (req, res) => {
    try {
        await AuditLog.deleteMany({});
        res.json({ message: 'All audit logs deleted successfully' });
    } catch (error) {
        console.error('Error deleting all audit logs:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};
