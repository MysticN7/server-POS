const mongoose = require('mongoose');

const bankTransactionSchema = new mongoose.Schema({
    transaction_date: {
        type: Date,
        default: Date.now
    },
    transaction_type: {
        type: String,
        enum: ['deposit', 'withdrawal', 'transfer']
    },
    amount: {
        type: Number,
        required: true,
        min: 0
    },
    bank_name: {
        type: String,
        trim: true
    },
    account_number: {
        type: String,
        trim: true
    },
    reference_number: {
        type: String,
        trim: true
    },
    description: {
        type: String,
        trim: true
    },
    category: {
        type: String,
        trim: true,
        default: 'General'
    },
    created_by: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    // Legacy fields kept for backward compatibility
    type: {
        type: String,
        enum: ['DEPOSIT', 'WITHDRAWAL']
    },
    bankName: {
        type: String,
        trim: true
    },
    accountNumber: {
        type: String,
        trim: true
    },
    date: {
        type: Date
    }
}, {
    timestamps: true
});

// Index for date-based queries
bankTransactionSchema.index({ transaction_date: -1, type: 1 });
bankTransactionSchema.index({ date: -1, type: 1 });

bankTransactionSchema.pre('save', function normalizeFields(next) {
    if (!this.transaction_type && this.type) {
        this.transaction_type = this.type === 'DEPOSIT'
            ? 'deposit'
            : this.type === 'WITHDRAWAL'
                ? 'withdrawal'
                : 'transfer';
    }

    if (!this.type && this.transaction_type) {
        if (this.transaction_type === 'deposit') this.type = 'DEPOSIT';
        if (this.transaction_type === 'withdrawal') this.type = 'WITHDRAWAL';
        if (this.transaction_type === 'transfer') this.type = 'TRANSFER';
    }

    if (!this.transaction_date && this.date) {
        this.transaction_date = this.date;
    }

    if (!this.date && this.transaction_date) {
        this.date = this.transaction_date;
    }

    if (!this.bank_name && this.bankName) {
        this.bank_name = this.bankName;
    }

    if (!this.bankName && this.bank_name) {
        this.bankName = this.bank_name;
    }

    if (!this.account_number && this.accountNumber) {
        this.account_number = this.accountNumber;
    }

    if (!this.accountNumber && this.account_number) {
        this.accountNumber = this.account_number;
    }

    next();
});

module.exports = mongoose.model('BankTransaction', bankTransactionSchema);
