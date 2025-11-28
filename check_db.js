const { sequelize, Product } = require('./models');

async function checkProducts() {
    try {
        await sequelize.authenticate();
        console.log('Database connected.');
        const products = await Product.findAll();
        console.log(`Found ${products.length} products in the database.`);
        products.forEach(p => console.log(`- ${p.name} (${p.sku})`));
    } catch (error) {
        console.error('Error checking products:', error);
    } finally {
        await sequelize.close();
    }
}

checkProducts();
