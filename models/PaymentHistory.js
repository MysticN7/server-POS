const mongoose = require('mongoose');

const paymentHistorySchema = new mongoose.Schema({
    invoice: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Invoice',
        required: true
    },
    amount: {
        type: Number,
        required: true,
        min: 0
    },
    paymentMethod: {
        type: String,
        enum: ['Cash', 'Card', 'MFS'],
        required: true
    },
    note: {
        type: String,
        trim: true
    }
}, {
    timestamps: true
});

// Index for faster lookups
paymentHistorySchema.index({ invoice: 1, createdAt: -1 });

module.exports = mongoose.model('PaymentHistory', paymentHistorySchema);
