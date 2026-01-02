const express = require('express');
const router = express.Router();
const salesController = require('../controllers/salesController');
const auth = require('../middleware/auth');

router.post('/', auth, salesController.createSale);
router.post('/legacy', auth, salesController.createLegacySale);
router.get('/', auth, salesController.getSales);
router.get('/date-range', auth, salesController.getSalesByDateRange);
router.get('/:id', auth, salesController.getSaleById);
router.put('/:id', auth, salesController.updateSale);
router.delete('/:id', auth, salesController.deleteSale);
router.post('/:id/payment', auth, salesController.addPayment);

router.get('/payments/history', auth, salesController.getPaymentHistory);
router.put('/payments/:id', auth, salesController.updatePayment);
router.delete('/payments/:id', auth, salesController.deletePayment);

module.exports = router;
