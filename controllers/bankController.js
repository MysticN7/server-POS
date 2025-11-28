const BankTransaction = require('../models/BankTransaction');

exports.getAllTransactions = async (req, res) => {
    try {
        const transactions = await BankTransaction.find().sort({ date: -1 });
        res.json(transactions);
    } catch (error) {
        console.error('Error fetching bank transactions:', error);
        res.status(500).json({ message: error.message });
    }
};

exports.createTransaction = async (req, res) => {
    try {
        const transaction = new BankTransaction(req.body);
        await transaction.save();
        res.status(201).json(transaction);
    } catch (error) {
        console.error('Error creating bank transaction:', error);
        res.status(400).json({ message: error.message });
    }
};

exports.updateTransaction = async (req, res) => {
    try {
        const transaction = await BankTransaction.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        );
        if (!transaction) {
            return res.status(404).json({ message: 'Transaction not found' });
        }
        res.json(transaction);
    } catch (error) {
        console.error('Error updating bank transaction:', error);
        res.status(400).json({ message: error.message });
    }
};

exports.deleteTransaction = async (req, res) => {
    try {
        const transaction = await BankTransaction.findByIdAndDelete(req.params.id);
        if (!transaction) {
            return res.status(404).json({ message: 'Transaction not found' });
        }
        res.json({ message: 'Transaction deleted successfully' });
    } catch (error) {
        console.error('Error deleting bank transaction:', error);
        res.status(500).json({ message: error.message });
    }
};

exports.getBalance = async (req, res) => {
    try {
        const deposits = await BankTransaction.aggregate([
            { $match: { type: 'DEPOSIT' } },
            { $group: { _id: null, total: { $sum: '$amount' } } }
        ]);

        const withdrawals = await BankTransaction.aggregate([
            { $match: { type: 'WITHDRAWAL' } },
            { $group: { _id: null, total: { $sum: '$amount' } } }
        ]);

        const depositTotal = deposits[0]?.total || 0;
        const withdrawalTotal = withdrawals[0]?.total || 0;
        const balance = depositTotal - withdrawalTotal;

        res.json({ balance, deposits: depositTotal, withdrawals: withdrawalTotal });
    } catch (error) {
        console.error('Error calculating bank balance:', error);
        res.status(500).json({ message: error.message });
    }
};
