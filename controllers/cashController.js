const CashTransaction = require('../models/CashTransaction');

exports.getAllTransactions = async (req, res) => {
    try {
        const transactions = await CashTransaction.find().sort({ date: -1 });
        res.json(transactions);
    } catch (error) {
        console.error('Error fetching cash transactions:', error);
        res.status(500).json({ message: error.message });
    }
};

exports.createTransaction = async (req, res) => {
    try {
        const transaction = new CashTransaction(req.body);
        await transaction.save();
        res.status(201).json(transaction);
    } catch (error) {
        console.error('Error creating cash transaction:', error);
        res.status(400).json({ message: error.message });
    }
};

exports.updateTransaction = async (req, res) => {
    try {
        const transaction = await CashTransaction.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        );
        if (!transaction) {
            return res.status(404).json({ message: 'Transaction not found' });
        }
        res.json(transaction);
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
        const cashIn = await CashTransaction.aggregate([
            { $match: { type: 'IN' } },
            { $group: { _id: null, total: { $sum: '$amount' } } }
        ]);

        const cashOut = await CashTransaction.aggregate([
            { $match: { type: 'OUT' } },
            { $group: { _id: null, total: { $sum: '$amount' } } }
        ]);

        const inTotal = cashIn[0]?.total || 0;
        const outTotal = cashOut[0]?.total || 0;
        const balance = inTotal - outTotal;

        res.json({ balance, cashIn: inTotal, cashOut: outTotal });
    } catch (error) {
        console.error('Error calculating cash balance:', error);
        res.status(500).json({ message: error.message });
    }
};
