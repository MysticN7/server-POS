const CashTransaction = require('../models/CashTransaction');

const normalizeCashTransaction = (transactionDoc) => {
    const transactionType = transactionDoc.transaction_type
        || (transactionDoc.type === 'IN' ? 'cash_in' : 'cash_out');

    const transactionDate = transactionDoc.transaction_date
        || transactionDoc.date
        || transactionDoc.createdAt;

    return {
        id: transactionDoc._id,
        transaction_date: transactionDate,
        transaction_type: transactionType,
        amount: Number(transactionDoc.amount || 0),
        source: transactionDoc.source || 'General',
        description: transactionDoc.description || '',
        category: transactionDoc.category || 'General'
    };
};

const applyCashFilters = (transactions, filters = {}) => {
    return transactions.filter((tx) => {
        if (filters.type && tx.transaction_type !== filters.type) {
            return false;
        }

        if (filters.category && tx.category) {
            const matchesCategory = tx.category.toLowerCase().includes(filters.category.toLowerCase());
            if (!matchesCategory) return false;
        }

        if (filters.startDate) {
            const start = new Date(filters.startDate);
            if (new Date(tx.transaction_date) < start) return false;
        }

        if (filters.endDate) {
            const end = new Date(filters.endDate);
            end.setHours(23, 59, 59, 999);
            if (new Date(tx.transaction_date) > end) return false;
        }

        return true;
    });
};

const addRunningBalance = (transactions) => {
    let runningBalance = 0;
    const asc = [...transactions].sort((a, b) => new Date(a.transaction_date) - new Date(b.transaction_date));

    const withBalance = asc.map((tx) => {
        runningBalance += tx.transaction_type === 'cash_in' ? tx.amount : -tx.amount;
        return {
            ...tx,
            balance_after: runningBalance
        };
    });

    return withBalance.sort((a, b) => new Date(b.transaction_date) - new Date(a.transaction_date));
};

const buildCashSummary = (transactions) => {
    const totals = transactions.reduce(
        (acc, tx) => {
            if (tx.transaction_type === 'cash_in') {
                acc.totalCashIn += tx.amount;
            } else {
                acc.totalCashOut += tx.amount;
            }
            return acc;
        },
        { totalCashIn: 0, totalCashOut: 0 }
    );

    const currentBalance = totals.totalCashIn - totals.totalCashOut;

    return {
        totalCashIn: totals.totalCashIn,
        totalCashOut: totals.totalCashOut,
        currentBalance,
        netChange: currentBalance
    };
};

exports.getTransactions = async (req, res) => {
    try {
        const filters = {
            startDate: req.query.startDate,
            endDate: req.query.endDate,
            type: req.query.type,
            category: req.query.category
        };

        const docs = await CashTransaction.find().sort({ transaction_date: 1, date: 1, createdAt: 1 });
        const normalized = docs.map(normalizeCashTransaction);
        const filtered = applyCashFilters(normalized, filters);
        const response = addRunningBalance(filtered);

        res.json({ transactions: response });
    } catch (error) {
        console.error('Error fetching cash transactions:', error);
        res.status(500).json({ message: error.message });
    }
};

exports.getSummary = async (req, res) => {
    try {
        const filters = {
            startDate: req.query.startDate,
            endDate: req.query.endDate
        };

        const docs = await CashTransaction.find();
        const normalized = docs.map(normalizeCashTransaction);
        const filtered = applyCashFilters(normalized, filters);
        const summary = buildCashSummary(filtered);

        res.json(summary);
    } catch (error) {
        console.error('Error building cash summary:', error);
        res.status(500).json({ message: error.message });
    }
};

exports.createTransaction = async (req, res) => {
    try {
        const { transaction_date, transaction_type, amount, source, description, category } = req.body;

        if (!transaction_type || !['cash_in', 'cash_out'].includes(transaction_type)) {
            return res.status(400).json({ message: 'Invalid transaction type' });
        }

        const numericAmount = Number(amount);
        if (!numericAmount || numericAmount <= 0) {
            return res.status(400).json({ message: 'Amount must be greater than zero' });
        }

        const transaction = new CashTransaction({
            transaction_date: transaction_date ? new Date(transaction_date) : undefined,
            transaction_type,
            amount: numericAmount,
            source: source || 'General',
            description,
            category: category || 'General',
            created_by: req.user?.id,
            type: transaction_type === 'cash_in' ? 'IN' : 'OUT',
            date: transaction_date ? new Date(transaction_date) : undefined
        });

        await transaction.save();
        res.status(201).json({ transaction: normalizeCashTransaction(transaction) });
    } catch (error) {
        console.error('Error creating cash transaction:', error);
        res.status(400).json({ message: error.message });
    }
};

exports.updateTransaction = async (req, res) => {
    try {
        const transaction = await CashTransaction.findById(req.params.id);
        if (!transaction) {
            return res.status(404).json({ message: 'Transaction not found' });
        }

        const { transaction_date, transaction_type, amount, source, description, category } = req.body;

        if (transaction_type && !['cash_in', 'cash_out'].includes(transaction_type)) {
            return res.status(400).json({ message: 'Invalid transaction type' });
        }

        if (transaction_date) {
            transaction.transaction_date = new Date(transaction_date);
            transaction.date = new Date(transaction_date);
        }

        if (transaction_type) {
            transaction.transaction_type = transaction_type;
            transaction.type = transaction_type === 'cash_in' ? 'IN' : 'OUT';
        }

        if (amount !== undefined) {
            const numericAmount = Number(amount);
            if (!numericAmount || numericAmount <= 0) {
                return res.status(400).json({ message: 'Amount must be greater than zero' });
            }
            transaction.amount = numericAmount;
        }

        if (source !== undefined) transaction.source = source;
        if (description !== undefined) transaction.description = description;
        if (category !== undefined) transaction.category = category;

        await transaction.save();
        res.json({ transaction: normalizeCashTransaction(transaction) });
    } catch (error) {
        console.error('Error updating cash transaction:', error);
        res.status(400).json({ message: error.message });
    }
};

exports.deleteTransaction = async (req, res) => {
    try {
        const transaction = await CashTransaction.findByIdAndDelete(req.params.id);
        if (!transaction) {
            return res.status(404).json({ message: 'Transaction not found' });
        }
        res.json({ message: 'Transaction deleted successfully' });
    } catch (error) {
        console.error('Error deleting cash transaction:', error);
        res.status(500).json({ message: error.message });
    }
};

exports.getBalance = async (req, res) => {
    try {
        const docs = await CashTransaction.find();
        const normalized = docs.map(normalizeCashTransaction);
        const summary = buildCashSummary(normalized);

        res.json({
            balance: summary.currentBalance,
            cashIn: summary.totalCashIn,
            cashOut: summary.totalCashOut
        });
    } catch (error) {
        console.error('Error calculating cash balance:', error);
        res.status(500).json({ message: error.message });
    }
};
