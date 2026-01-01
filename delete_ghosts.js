const mongoose = require('mongoose');
const Product = require('./models/Product');
require('dotenv').config();

const deleteGhosts = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected. Deleting unwanted products...');

        const idsToDelete = [
            '69297c508cddce4b833399b8', // BC MOON
            '69297c508cddce4b833399b6', // Blue Light Blocking Lens
            '69297c508cddce4b833399b4', // Single Vision Lens
            '69297c508cddce4b833399b5', // Progressive Lens
            '69297c508cddce4b833399b7'  // Photochromic Lens
        ];

        const result = await Product.deleteMany({ _id: { $in: idsToDelete } });
        console.log(`Deleted ${result.deletedCount} products.`);

    } catch (error) {
        console.error(error);
    } finally {
        await mongoose.disconnect();
    }
};

deleteGhosts();
