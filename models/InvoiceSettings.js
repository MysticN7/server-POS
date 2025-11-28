const mongoose = require('mongoose');

const invoiceSettingsSchema = new mongoose.Schema({
    business_name: {
        type: String,
        default: 'Minar Optics',
        trim: true
    },
    address: {
        type: String,
        trim: true
    },
    phone: {
        type: String,
        trim: true
    },
    email: {
        type: String,
        trim: true,
        lowercase: true
    },
    website: {
        type: String,
        trim: true
    },
    map_link: {
        type: String,
        trim: true
    },
    footer_text: {
        type: String,
        trim: true
    },
    show_served_by: {
        type: Boolean,
        default: true
    },
    show_date_time: {
        type: Boolean,
        default: true
    },
    header_font_size: {
        type: Number,
        default: 12,
        min: 8,
        max: 24
    },
    body_font_size: {
        type: Number,
        default: 10,
        min: 8,
        max: 20
    },
    show_note: {
        type: Boolean,
        default: true
    },
    show_signature: {
        type: Boolean,
        default: false
    },
    invoice_prefix: {
        type: String,
        default: 'INV',
        trim: true
    },
    tax_rate: {
        type: Number,
        default: 0,
        min: 0
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('InvoiceSettings', invoiceSettingsSchema);
