const mongoose = require('mongoose');

const invoiceSchema = new mongoose.Schema({
    invoiceNumber: {
        type: String,
        required: true,
        unique: true
    },
    customer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Customer',
        required: true
    },
    totalAmount: {
        type: Number,
        required: true,
        min: 0
    },
    discount: {
        type: Number,
        default: 0,
        min: 0
    },
    paidAmount: {
        type: Number,
        default: 0,
        min: 0
    },
    dueAmount: {
        type: Number,
        default: 0,
        min: 0
    },
    paymentMethod: {
        type: String,
        enum: ['Cash', 'Card', 'MFS'],
        default: 'Cash'
    },
    status: {
        type: String,
        enum: ['PENDING', 'PAID', 'PARTIAL'],
        default: 'PENDING'
    },
    note: {
        type: String,
        trim: true
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
}, {
    timestamps: true
});

// Index for faster searches
invoiceSchema.index({ invoiceNumber: 1, customer: 1, createdAt: -1 });

module.exports = mongoose.model('Invoice', invoiceSchema);
