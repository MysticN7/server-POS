const mongoose = require('mongoose');

const cashTransactionSchema = new mongoose.Schema({
    type: {
        type: String,
        enum: ['IN', 'OUT'],
        required: true
    },
    amount: {
        type: Number,
        required: true,
        min: 0
    },
    description: {
        type: String,
        required: true,
        trim: true
    },
    category: {
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
cashTransactionSchema.index({ date: -1, type: 1 });

module.exports = mongoose.model('CashTransaction', cashTransactionSchema);
