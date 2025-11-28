const { sequelize } = require('./config/db');
const Product = require('./models/Product');

async function testProductFetch() {
    try {
        await sequelize.authenticate();
        console.log('Database connected.');

        console.log('Fetching products...');
        const products = await Product.findAll();
        console.log('Products fetched successfully:', products.length);
        console.log(JSON.stringify(products, null, 2));
    } catch (error) {
        console.error('Error fetching products:', error);
    } finally {
        await sequelize.close();
    }
}

testProductFetch();
