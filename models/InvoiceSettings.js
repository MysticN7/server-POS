const mongoose = require('mongoose');

const invoiceSettingsSchema = new mongoose.Schema({
    shopName: {
        type: String,
        required: true,
        trim: true
    },
    shopAddress: {
        type: String,
        trim: true
    },
    shopPhone: {
        type: String,
        trim: true
    },
    shopEmail: {
        type: String,
        trim: true,
        lowercase: true
    },
    taxRate: {
        type: Number,
        default: 0,
        min: 0
    },
    invoicePrefix: {
        type: String,
        default: 'INV',
        trim: true
    },
    termsAndConditions: {
        type: String,
        trim: true
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('InvoiceSettings', invoiceSettingsSchema);
