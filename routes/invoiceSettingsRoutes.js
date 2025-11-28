const express = require('express');
const router = express.Router();
const { getSettings, updateSettings } = require('../controllers/invoiceSettingsController');
const auth = require('../middleware/auth');

router.get('/', auth, getSettings);
router.put('/', auth, updateSettings);

module.exports = router;
