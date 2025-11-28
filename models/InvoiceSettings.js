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
    ,
    accent_color: {
        type: String,
        trim: true,
        default: '#1f2937'
    },
    theme: {
        type: String,
        trim: true,
        default: 'modern'
    },
    show_icons: {
        type: Boolean,
        default: true
    },
    logo_url: {
        type: String,
        trim: true
    },
    show_logo: {
        type: Boolean,
        default: false
    },
    show_rx_table: {
        type: Boolean,
        default: true
    },
    paper_width_mm: {
        type: Number,
        default: 80,
        min: 50,
        max: 90
    },
    paper_margin_mm: {
        type: Number,
        default: 4,
        min: 0,
        max: 10
    },
    compact_mode: {
        type: Boolean,
        default: true
    },
    logo_position: {
        type: String,
        enum: ['left', 'center', 'right'],
        default: 'center'
    },
    logo_size_px: {
        type: Number,
        default: 24,
        min: 12,
        max: 64
    },
    logo_cloudinary_id: {
        type: String,
        trim: true
    },
    grid_thickness_px: {
        type: Number,
        default: 2,
        min: 1,
        max: 3
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('InvoiceSettings', invoiceSettingsSchema);
