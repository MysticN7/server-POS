const mongoose = require('mongoose');

const cashTransactionSchema = new mongoose.Schema({
    transaction_date: {
        type: Date,
        default: Date.now
    },
    transaction_type: {
        type: String,
        enum: ['cash_in', 'cash_out']
    },
    amount: {
        type: Number,
        required: true,
        min: 0
    },
    source: {
        type: String,
        trim: true,
        default: 'General'
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
        enum: ['IN', 'OUT']
    },
    date: {
        type: Date
    }
}, {
    timestamps: true
});

// Index for date-based queries
cashTransactionSchema.index({ transaction_date: -1, type: 1 });
cashTransactionSchema.index({ date: -1, type: 1 });

cashTransactionSchema.pre('save', function normalizeFields(next) {
    if (!this.transaction_type && this.type) {
        this.transaction_type = this.type === 'IN' ? 'cash_in' : 'cash_out';
    }

    if (!this.type && this.transaction_type) {
        this.type = this.transaction_type === 'cash_in' ? 'IN' : 'OUT';
    }

    if (!this.transaction_date && this.date) {
        this.transaction_date = this.date;
    }

    if (!this.date && this.transaction_date) {
        this.date = this.transaction_date;
    }

    next();
});

module.exports = mongoose.model('CashTransaction', cashTransactionSchema);
