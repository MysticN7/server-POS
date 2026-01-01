const mongoose = require('mongoose');
const Product = require('./models/Product');
require('dotenv').config();

const scanProducts = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to DB. Scanning for lens-like products...');

        const products = await Product.find({
            $or: [
                { category: { $regex: /lens/i } },
                { name: { $regex: /lens/i } },
                { name: { $in: ['BC MOON', 'BC MOON D CUT', 'Blue Light Blocking Lens', 'Single Vision Lens', 'Progressive Lens', 'Photochromic Lens'] } }
            ]
        });

        console.log(`Found ${products.length} potential matches.`);
        products.forEach(p => {
            console.log(`ID: ${p._id} | Name: "${p.name}" | Category: "${p.category}" | Stock: ${p.stockQuantity}`);
        });

    } catch (error) {
        console.error(error);
    } finally {
        await mongoose.disconnect();
    }
};

scanProducts();
