const Invoice = require('../models/Invoice');
const InvoiceItem = require('../models/InvoiceItem');
const Expense = require('../models/Expense');
const CashTransaction = require('../models/CashTransaction');
const Product = require('../models/Product');

// Dashboard Stats
exports.getDashboardStats = async (req, res) => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const todaySales = await Invoice.aggregate([
            {
                $match: {
                    createdAt: { $gte: today },
                    status: { $ne: 'CANCELLED' }
                }
            },
            {
                $group: {
                    _id: null,
                    total: { $sum: '$totalAmount' },
                    count: { $sum: 1 }
                }
            }
        ]);

        const totalCustomers = await Invoice.distinct('customer').then(customers => customers.length);
        const lowStockProducts = await Product.countDocuments({ stockQuantity: { $lt: 10 } });
        const pendingInvoices = await Invoice.countDocuments({ status: { $in: ['PENDING', 'PARTIAL'] } });

        res.json({
            todaySales: todaySales[0]?.total || 0,
            todaySalesCount: todaySales[0]?.count || 0,
            totalCustomers,
            lowStockProducts,
            pendingInvoices
        });
    } catch (error) {
        console.error('Error fetching dashboard stats:', error);
        res.status(500).json({ message: error.message });
    }
};

// Recent Sales
exports.getRecentSales = async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 10;
        const sales = await Invoice.find({ status: { $ne: 'CANCELLED' } })
            .populate('customer', 'name phone')
            .sort({ createdAt: -1 })
            .limit(limit);
        res.json(sales);
    } catch (error) {
        console.error('Error fetching recent sales:', error);
        res.status(500).json({ message: error.message });
    }
};

// Pending Invoices
exports.getPendingInvoices = async (req, res) => {
    try {
        const invoices = await Invoice.find({
            status: { $in: ['PENDING', 'PARTIAL'] }
        })
            .populate('customer', 'name phone')
            .sort({ createdAt: -1 });
        res.json(invoices);
    } catch (error) {
        console.error('Error fetching pending invoices:', error);
        res.status(500).json({ message: error.message });
    }
};

// Sales Summary
exports.getSalesSummary = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;

        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);

        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);

        const summary = await Invoice.aggregate([
            {
                $match: {
                    createdAt: { $gte: start, $lte: end },
                    status: { $ne: 'CANCELLED' }
                }
            },
            {
                $group: {
                    _id: null,
                    totalSales: { $sum: '$totalAmount' },
                    totalCollected: { $sum: '$paidAmount' },
                    totalDue: { $sum: '$dueAmount' },
                    totalDiscount: { $sum: '$discount' },
                    count: { $sum: 1 }
                }
            }
        ]);

        res.json(summary[0] || {
            totalSales: 0,
            totalCollected: 0,
            totalDue: 0,
            totalDiscount: 0,
            count: 0
        });
    } catch (error) {
        console.error('Error fetching sales summary:', error);
        res.status(500).json({ message: error.message });
    }
};

// Product Performance
exports.getProductPerformance = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;

        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);

        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);

        // Get all invoice items in date range
        const invoices = await Invoice.find({
            createdAt: { $gte: start, $lte: end },
            status: { $ne: 'CANCELLED' }
        }).select('_id');

        const invoiceIds = invoices.map(inv => inv._id);

        const performance = await InvoiceItem.aggregate([
            {
                $match: {
                    invoice: { $in: invoiceIds }
                }
            },
            {
                $group: {
                    _id: '$itemName',
                    totalQuantity: { $sum: '$quantity' },
                    totalRevenue: { $sum: '$totalPrice' }
                }
            },
            {
                $sort: { totalRevenue: -1 }
            },
            {
                $limit: 10
            }
        ]);

        res.json(performance);
    } catch (error) {
        console.error('Error fetching product performance:', error);
        res.status(500).json({ message: error.message });
    }
};

// Profit & Loss Report
exports.getProfitLoss = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;

        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);

        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);

        const salesRevenue = await Invoice.aggregate([
            {
                $match: {
                    createdAt: { $gte: start, $lte: end },
                    status: { $ne: 'CANCELLED' }
                }
            },
            {
                $group: {
                    _id: null,
                    total: { $sum: '$totalAmount' },
                    discount: { $sum: '$discount' }
                }
            }
        ]);

        const expenses = await Expense.aggregate([
            {
                $match: {
                    date: { $gte: start, $lte: end }
                }
            },
            {
                $group: {
                    _id: null,
                    total: { $sum: '$amount' }
                }
            }
        ]);

        const revenue = salesRevenue[0]?.total || 0;
        const totalDiscount = salesRevenue[0]?.discount || 0;
        const totalExpenses = expenses[0]?.total || 0;
        const netRevenue = revenue - totalDiscount;
        const profit = netRevenue - totalExpenses;

        res.json({
            revenue,
            discount: totalDiscount,
            netRevenue,
            expenses: totalExpenses,
            profit
        });
    } catch (error) {
        console.error('Error generating profit/loss report:', error);
        res.status(500).json({ message: error.message });
    }
};

// Cash Book Report
exports.getCashBook = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;

        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);

        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);

        const transactions = await CashTransaction.find({
            date: { $gte: start, $lte: end }
        }).sort({ date: 1 });

        const summary = await CashTransaction.aggregate([
            {
                $match: {
                    date: { $gte: start, $lte: end }
                }
            },
            {
                $group: {
                    _id: '$type',
                    total: { $sum: '$amount' }
                }
            }
        ]);

        const cashIn = summary.find(s => s._id === 'IN')?.total || 0;
        const cashOut = summary.find(s => s._id === 'OUT')?.total || 0;

        res.json({
            transactions,
            summary: {
                cashIn,
                cashOut,
                balance: cashIn - cashOut
            }
        });
    } catch (error) {
        console.error('Error generating cash book report:', error);
        res.status(500).json({ message: error.message });
    }
};
