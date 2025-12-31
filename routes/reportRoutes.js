const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const auth = require('../middleware/auth');
const checkPermission = require('../middleware/checkPermission');

router.get('/sales-summary', auth, reportController.getSalesSummary);
router.get('/product-performance', auth, reportController.getProductPerformance);
router.get('/dashboard-stats', auth, checkPermission('VIEW_MONTHLY_SALES'), reportController.getDashboardStats);
router.get('/recent-sales', auth, reportController.getRecentSales);
router.get('/pending-invoices', auth, reportController.getPendingInvoices);
router.get('/profit-loss', auth, reportController.getProfitLoss);

module.exports = router;
