const express = require('express');
const router = express.Router();
const { getSettings, updateSettings, uploadLogoHandler } = require('../controllers/invoiceSettingsController');
const auth = require('../middleware/auth');

router.get('/', auth, getSettings);
router.put('/', auth, updateSettings);
router.post('/logo', auth, uploadLogoHandler);

module.exports = router;
