const express = require('express');
const router = express.Router();
const salesController = require('../controllers/salesController');
const auth = require('../middleware/auth');
const checkPermission = require('../middleware/checkPermission');

router.post('/', auth, salesController.createSale);
router.get('/', auth, checkPermission('VIEW_DAILY_SALES'), salesController.getSales);
router.get('/date-range', auth, checkPermission('VIEW_DAILY_SALES'), salesController.getSalesByDateRange);
router.get('/:id', auth, checkPermission('VIEW_DAILY_SALES'), salesController.getSaleById);
router.put('/:id', auth, salesController.updateSale);
router.delete('/:id', auth, salesController.deleteSale);
router.post('/:id/payment', auth, salesController.addPayment);

module.exports = router;
