module.exports = function (permission) {
    return function (req, res, next) {
        // Administrative always has access
        if (req.user && req.user.role === 'ADMINISTRATIVE') {
            return next();
        }

        // Check if user has permission
        if (req.user && req.user.permissions && req.user.permissions.includes(permission)) {
            return next();
        }

        return res.status(403).json({ message: 'Access denied. You do not have permission to perform this action.' });
    };
};
