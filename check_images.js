const { sequelize } = require('./models');
const Product = require('./models/Product');

const checkImages = async () => {
    try {
        await sequelize.authenticate();
        console.log('Database connected.');
        const products = await Product.findAll();
        products.forEach(p => {
            if (p.imageUrl) {
                console.log(`ImageURL: ${JSON.stringify(p.imageUrl)}`);
            }
        });
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await sequelize.close();
    }
};

checkImages();
