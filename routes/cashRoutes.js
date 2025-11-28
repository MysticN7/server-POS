const express = require('express');
const router = express.Router();
const cashController = require('../controllers/cashController');
const auth = require('../middleware/auth');

router.use(auth);

router.get('/transactions', cashController.getTransactions);
router.post('/transactions', cashController.createTransaction);
router.put('/transactions/:id', cashController.updateTransaction);
router.delete('/transactions/:id', cashController.deleteTransaction);
router.get('/summary', cashController.getSummary);
router.get('/balance', cashController.getBalance);

module.exports = router;
