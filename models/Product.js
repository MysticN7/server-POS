const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    sku: {
        type: String,
        unique: true,
        sparse: true,
        trim: true
    },
    category: {
        type: String,
        required: true
    },
    price: {
        type: Number,
        default: 0,
        min: 0
    },
    stockQuantity: {
        type: Number,
        required: true,
        default: 0,
        min: 0
    },
    description: {
        type: String,
        trim: true
    },
    imageUrl: {
        type: String,
        trim: true
    },
    cloudinaryId: {
        type: String,
        trim: true
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Index for faster searches
productSchema.index({ name: 1, sku: 1, category: 1 });

module.exports = mongoose.model('Product', productSchema);
