const express = require('express');
const router = express.Router();
const bankController = require('../controllers/bankController');
const auth = require('../middleware/auth');

router.use(auth);

router.get('/transactions', bankController.getTransactions);
router.post('/transactions', bankController.createTransaction);
router.put('/transactions/:id', bankController.updateTransaction);
router.delete('/transactions/:id', bankController.deleteTransaction);
router.get('/summary', bankController.getSummary);
router.get('/balance', bankController.getBalance);

module.exports = router;
