const BankTransaction = require('../models/BankTransaction');

const normalizeBankTransaction = (transactionDoc) => {
    const transactionType = transactionDoc.transaction_type
        || (transactionDoc.type === 'DEPOSIT'
            ? 'deposit'
            : transactionDoc.type === 'WITHDRAWAL'
                ? 'withdrawal'
                : 'transfer');

    const transactionDate = transactionDoc.transaction_date
        || transactionDoc.date
        || transactionDoc.createdAt;

    return {
        id: transactionDoc._id,
        transaction_date: transactionDate,
        transaction_type: transactionType,
        amount: Number(transactionDoc.amount || 0),
        bank_name: transactionDoc.bank_name || transactionDoc.bankName || '',
        account_number: transactionDoc.account_number || transactionDoc.accountNumber || '',
        reference_number: transactionDoc.reference_number || '',
        description: transactionDoc.description || '',
        category: transactionDoc.category || 'General'
    };
};

const applyBankFilters = (transactions, filters = {}) => {
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

const addRunningBankBalance = (transactions) => {
    let runningBalance = 0;
    const asc = [...transactions].sort((a, b) => new Date(a.transaction_date) - new Date(b.transaction_date));

    const withBalance = asc.map((tx) => {
        if (tx.transaction_type === 'deposit') {
            runningBalance += tx.amount;
        } else if (tx.transaction_type === 'withdrawal') {
            runningBalance -= tx.amount;
        }
        // transfers are neutral

        return {
            ...tx,
            balance_after: runningBalance
        };
    });

    return withBalance.sort((a, b) => new Date(b.transaction_date) - new Date(a.transaction_date));
};

const buildBankSummary = (transactions) => {
    const totals = transactions.reduce(
        (acc, tx) => {
            if (tx.transaction_type === 'deposit') acc.totalDeposits += tx.amount;
            if (tx.transaction_type === 'withdrawal') acc.totalWithdrawals += tx.amount;
            return acc;
        },
        { totalDeposits: 0, totalWithdrawals: 0 }
    );

    const currentBalance = totals.totalDeposits - totals.totalWithdrawals;

    return {
        totalDeposits: totals.totalDeposits,
        totalWithdrawals: totals.totalWithdrawals,
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

        const docs = await BankTransaction.find().sort({ transaction_date: 1, date: 1, createdAt: 1 });
        const normalized = docs.map(normalizeBankTransaction);
        const filtered = applyBankFilters(normalized, filters);
        const response = addRunningBankBalance(filtered);

        res.json({ transactions: response });
    } catch (error) {
        console.error('Error fetching bank transactions:', error);
        res.status(500).json({ message: error.message });
    }
};

exports.getSummary = async (req, res) => {
    try {
        const filters = {
            startDate: req.query.startDate,
            endDate: req.query.endDate
        };

        const docs = await BankTransaction.find();
        const normalized = docs.map(normalizeBankTransaction);
        const filtered = applyBankFilters(normalized, filters);
        const summary = buildBankSummary(filtered);

        res.json(summary);
    } catch (error) {
        console.error('Error building bank summary:', error);
        res.status(500).json({ message: error.message });
    }
};

exports.createTransaction = async (req, res) => {
    try {
        const {
            transaction_date,
            transaction_type,
            amount,
            bank_name,
            account_number,
            reference_number,
            description,
            category
        } = req.body;

        if (!transaction_type || !['deposit', 'withdrawal', 'transfer'].includes(transaction_type)) {
            return res.status(400).json({ message: 'Invalid transaction type' });
        }

        const numericAmount = Number(amount);
        if (!numericAmount || numericAmount <= 0) {
            return res.status(400).json({ message: 'Amount must be greater than zero' });
        }

        const transaction = new BankTransaction({
            transaction_date: transaction_date ? new Date(transaction_date) : undefined,
            transaction_type,
            amount: numericAmount,
            bank_name,
            account_number,
            reference_number,
            description,
            category: category || 'General',
            created_by: req.user?.id,
            type: transaction_type === 'deposit' ? 'DEPOSIT'
                : transaction_type === 'withdrawal'
                    ? 'WITHDRAWAL'
                    : 'TRANSFER',
            date: transaction_date ? new Date(transaction_date) : undefined
        });

        await transaction.save();
        res.status(201).json({ transaction: normalizeBankTransaction(transaction) });
    } catch (error) {
        console.error('Error creating bank transaction:', error);
        res.status(400).json({ message: error.message });
    }
};

exports.updateTransaction = async (req, res) => {
    try {
        const transaction = await BankTransaction.findById(req.params.id);
        if (!transaction) {
            return res.status(404).json({ message: 'Transaction not found' });
        }

        const {
            transaction_date,
            transaction_type,
            amount,
            bank_name,
            account_number,
            reference_number,
            description,
            category
        } = req.body;

        if (transaction_type && !['deposit', 'withdrawal', 'transfer'].includes(transaction_type)) {
            return res.status(400).json({ message: 'Invalid transaction type' });
        }

        if (transaction_date) {
            transaction.transaction_date = new Date(transaction_date);
            transaction.date = new Date(transaction_date);
        }

        if (transaction_type) {
            transaction.transaction_type = transaction_type;
            transaction.type = transaction_type === 'deposit'
                ? 'DEPOSIT'
                : transaction_type === 'withdrawal'
                    ? 'WITHDRAWAL'
                    : 'TRANSFER';
        }

        if (amount !== undefined) {
            const numericAmount = Number(amount);
            if (!numericAmount || numericAmount <= 0) {
                return res.status(400).json({ message: 'Amount must be greater than zero' });
            }
            transaction.amount = numericAmount;
        }

        if (bank_name !== undefined) transaction.bank_name = bank_name;
        if (account_number !== undefined) transaction.account_number = account_number;
        if (reference_number !== undefined) transaction.reference_number = reference_number;
        if (description !== undefined) transaction.description = description;
        if (category !== undefined) transaction.category = category;

        await transaction.save();
        res.json({ transaction: normalizeBankTransaction(transaction) });
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
        const docs = await BankTransaction.find();
        const normalized = docs.map(normalizeBankTransaction);
        const summary = buildBankSummary(normalized);

        res.json({
            balance: summary.currentBalance,
            deposits: summary.totalDeposits,
            withdrawals: summary.totalWithdrawals
        });
    } catch (error) {
        console.error('Error calculating bank balance:', error);
        res.status(500).json({ message: error.message });
    }
};
