const mongoose = require('mongoose');

const customerSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    phone: {
        type: String,
        required: false,
        trim: true
    },
    email: {
        type: String,
        trim: true,
        lowercase: true
    },
    address: {
        type: String,
        trim: true
    },
    customer_type: {
        type: String,
        enum: ['regular', 'vip', 'wholesale'],
        default: 'regular'
    },
    notes: {
        type: String,
        trim: true
    },
    total_purchases: {
        type: Number,
        default: 0
    },
    total_visits: {
        type: Number,
        default: 0
    },
    totalPurchases: {
        type: Number,
        default: 0
    },
    totalDue: {
        type: Number,
        default: 0
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Index for faster searches
customerSchema.index({ name: 1, phone: 1 });

module.exports = mongoose.model('Customer', customerSchema);
