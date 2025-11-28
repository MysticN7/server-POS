const { sequelize } = require('./config/db');

async function checkSchema() {
    try {
        console.log('Checking Customers table schema...');
        const queryInterface = sequelize.getQueryInterface();
        const tableDescription = await queryInterface.describeTable('Customers');
        console.log(JSON.stringify(tableDescription, null, 2));
        process.exit(0);
    } catch (error) {
        console.error('Error checking schema:', error);
        process.exit(1);
    }
}

checkSchema();
