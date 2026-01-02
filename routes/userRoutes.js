const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const auth = require('../middleware/auth');

const checkPermission = require('../middleware/checkPermission');

router.get('/', auth, checkPermission('USERS_VIEW'), userController.getAllUsers);
router.post('/', auth, checkPermission('USERS_CREATE'), userController.createUser);
router.put('/:id', auth, checkPermission('USERS_UPDATE'), userController.updateUser);
router.delete('/:id', auth, checkPermission('USERS_DELETE'), userController.deleteUser);
router.get('/permissions', auth, checkPermission('USERS_VIEW'), userController.getPermissionsCatalog);

module.exports = router;
