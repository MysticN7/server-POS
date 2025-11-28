const Product = require('../models/Product');
const { uploadImage, deleteImage } = require('../utils/cloudinary');

exports.getAllProducts = async (req, res) => {
    try {
        const products = await Product.find();
        res.json(products);
    } catch (error) {
        console.error('Error fetching products:', error);
        res.status(500).json({ message: error.message });
    }
};

exports.createProduct = async (req, res) => {
    try {
        const productData = { ...req.body };

        if (!productData.sku || (typeof productData.sku === 'string' && productData.sku.trim() === '')) {
            delete productData.sku;
        }

        // Parse numeric fields (FormData sends everything as strings)
        if (productData.price && productData.price !== '') {
            productData.price = parseFloat(productData.price);
        } else {
            productData.price = 0;
        }

        if (productData.stockQuantity) {
            productData.stockQuantity = parseInt(productData.stockQuantity);
        }

        // Upload image to Cloudinary if file was uploaded
        if (req.file) {
            const result = await uploadImage(req.file.buffer, 'pos-products');
            productData.imageUrl = result.url;
            productData.cloudinaryId = result.publicId;
        }

        const product = new Product(productData);
        await product.save();

        res.status(201).json(product);
    } catch (error) {
        console.error('Error creating product:', error);
        res.status(400).json({ message: error.message });
    }
};

exports.updateProduct = async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = { ...req.body };

        if (updateData.sku !== undefined && (updateData.sku === null || (typeof updateData.sku === 'string' && updateData.sku.trim() === ''))) {
            delete updateData.sku;
        }

        // Parse numeric fields
        if (updateData.price && updateData.price !== '') {
            updateData.price = parseFloat(updateData.price);
        } else if (updateData.price === '') {
            updateData.price = 0;
        }

        if (updateData.stockQuantity) {
            updateData.stockQuantity = parseInt(updateData.stockQuantity);
        }
        if (updateData.additionalStock) {
            updateData.additionalStock = parseInt(updateData.additionalStock);
        }

        const product = await Product.findById(id);
        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }

        // Handle image update
        if (req.file) {
            // Delete old image from Cloudinary if it exists
            if (product.cloudinaryId) {
                await deleteImage(product.cloudinaryId);
            }

            // Upload new image
            const result = await uploadImage(req.file.buffer, 'pos-products');
            updateData.imageUrl = result.url;
            updateData.cloudinaryId = result.publicId;
        }

        // Increment stock if additionalStock provided
        if (updateData.additionalStock && !isNaN(updateData.additionalStock) && updateData.additionalStock > 0) {
            product.stockQuantity = (product.stockQuantity || 0) + updateData.additionalStock;
            delete updateData.additionalStock;
            delete updateData.stockQuantity;
        }

        // Update product
        Object.assign(product, updateData);
        await product.save();

        res.json(product);
    } catch (error) {
        console.error('Error updating product:', error);
        res.status(400).json({ message: error.message });
    }
};

exports.deleteProduct = async (req, res) => {
    try {
        const { id } = req.params;
        console.log('Backend: Deleting product with ID:', id);

        const product = await Product.findById(id);
        if (!product) {
            console.log('Backend: Product not found');
            return res.status(404).json({ message: 'Product not found' });
        }

        // Delete image from Cloudinary if it exists
        if (product.cloudinaryId) {
            await deleteImage(product.cloudinaryId);
            console.log('Backend: Deleted associated image from Cloudinary');
        }

        await product.deleteOne();
        console.log('Backend: Product deleted successfully');
        res.json({ message: 'Product deleted' });
    } catch (error) {
        console.error('Backend: Error deleting product:', error);
        res.status(500).json({ message: error.message });
    }
};
