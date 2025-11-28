const mongoose = require('mongoose');

const invoiceItemSchema = new mongoose.Schema({
    invoice: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Invoice',
        required: true
    },
    product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product'
    },
    itemName: {
        type: String,
        required: true,
        trim: true
    },
    quantity: {
        type: Number,
        required: true,
        min: 1
    },
    unitPrice: {
        type: Number,
        required: true,
        min: 0
    },
    totalPrice: {
        type: Number,
        required: true,
        min: 0
    },
    isPrescriptionRequired: {
        type: Boolean,
        default: false
    },
    prescriptionData: {
        type: mongoose.Schema.Types.Mixed
    }
}, {
    timestamps: true
});

// Index for faster lookups
invoiceItemSchema.index({ invoice: 1 });

module.exports = mongoose.model('InvoiceItem', invoiceItemSchema);
