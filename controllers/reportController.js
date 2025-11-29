const Invoice = require('../models/Invoice');
const InvoiceItem = require('../models/InvoiceItem');
const Expense = require('../models/Expense');
const CashTransaction = require('../models/CashTransaction');
const Product = require('../models/Product');

const defaultSummaryResponse = {
    totalSales: 0,
    netSales: 0,
    totalPaid: 0,
    totalDue: 0,
    transactionCount: 0
};

const getDateRange = (query = {}) => {
    if (query.startDate && query.endDate) {
        const start = new Date(query.startDate);
        start.setHours(0, 0, 0, 0);

        const end = new Date(query.endDate);
        end.setHours(23, 59, 59, 999);

        return { start, end };
    }

    // default to last 30 days
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    const start = new Date(end);
    start.setDate(start.getDate() - 30);
    start.setHours(0, 0, 0, 0);

    return { start, end };
};

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
        const { start, end } = getDateRange(req.query);

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

        const raw = summary[0];

        if (!raw) {
            return res.json(defaultSummaryResponse);
        }

        res.json({
            totalSales: raw.totalSales,
            netSales: raw.totalSales - raw.totalDiscount,
            totalPaid: raw.totalCollected,
            totalDue: raw.totalDue,
            transactionCount: raw.count
        });
    } catch (error) {
        console.error('Error fetching sales summary:', error);
        res.status(500).json({ message: error.message });
    }
};

// Product Performance
exports.getProductPerformance = async (req, res) => {
    try {
        const { start, end } = getDateRange(req.query);
        const limit = parseInt(req.query.limit, 10) || 10;

        const invoices = await Invoice.find({
            createdAt: { $gte: start, $lte: end },
            status: { $ne: 'CANCELLED' }
        }).select('_id');

        const invoiceIds = invoices.map(inv => inv._id);

        if (!invoiceIds.length) {
            return res.json([]);
        }

        const performance = await InvoiceItem.aggregate([
            {
                $match: {
                    invoice: { $in: invoiceIds }
                }
            },
            {
                $group: {
                    _id: {
                        product: '$product',
                        itemName: '$itemName'
                    },
                    totalQuantity: { $sum: '$quantity' },
                    totalRevenue: { $sum: '$totalPrice' }
                }
            },
            {
                $lookup: {
                    from: 'products',
                    localField: '_id.product',
                    foreignField: '_id',
                    as: 'product'
                }
            },
            {
                $addFields: {
                    productId: '$_id.product',
                    productName: {
                        $ifNull: [
                            { $first: '$product.name' },
                            '$_id.itemName',
                            'Unnamed Product'
                        ]
                    },
                    sku: { $first: '$product.sku' }
                }
            },
            {
                $project: {
                    _id: 0,
                    productId: 1,
                    productName: 1,
                    sku: 1,
                    totalQuantity: 1,
                    totalRevenue: 1
                }
            },
            { $sort: { totalRevenue: -1 } },
            { $limit: limit }
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

        const expensesByCategory = await Expense.aggregate([
            {
                $match: {
                    date: { $gte: start, $lte: end }
                }
            },
            {
                $group: {
                    _id: '$category',
                    total: { $sum: '$amount' }
                }
            }
        ]);

        const expensesByCategoryMap = {};
        expensesByCategory.forEach(item => {
            expensesByCategoryMap[item._id] = item.total;
        });

        const revenue = salesRevenue[0]?.total || 0;
        const totalDiscount = salesRevenue[0]?.discount || 0;
        const totalExpenses = expenses[0]?.total || 0;
        const cogs = 0; // Cost of Goods Sold - Not currently tracked
        const netRevenue = revenue - totalDiscount;
        const profit = netRevenue - cogs - totalExpenses;

        res.json({
            totalRevenue: revenue,
            discount: totalDiscount,
            netRevenue,
            totalExpenses,
            cogs,
            profit,
            expensesByCategory: expensesByCategoryMap
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
