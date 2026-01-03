const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true,
        uppercase: true  // Automatically convert to uppercase
    },
    sku: {
        type: String,
        unique: true,
        sparse: true,
        trim: true,
        uppercase: true  // SKU also uppercase
    },
    category: {
        type: String,
        uppercase: true,  // Category uppercase
        default: ''  // Optional - empty string if not set
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
