const mongoose = require('mongoose');

const bankTransactionSchema = new mongoose.Schema({
    type: {
        type: String,
        enum: ['DEPOSIT', 'WITHDRAWAL'],
        required: true
    },
    amount: {
        type: Number,
        required: true,
        min: 0
    },
    description: {
        type: String,
        trim: true
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
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

// Index for date-based queries
bankTransactionSchema.index({ date: -1, type: 1 });

module.exports = mongoose.model('BankTransaction', bankTransactionSchema);
