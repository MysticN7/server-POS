const { sequelize, BankTransaction, CashTransaction, Customer } = require('./models');

async function syncDatabase() {
    try {
        console.log('Syncing database models...');

        // Sync all models (alter: true will update existing tables)
        await sequelize.sync({ alter: true });

        console.log('✅ Database synced successfully!');
        console.log('New tables created:');
        console.log('  - bank_transactions');
        console.log('  - cash_transactions');
        console.log('Customer table updated with new fields');

        process.exit(0);
    } catch (error) {
        console.error('❌ Error syncing database:', error);
        process.exit(1);
    }
}

syncDatabase();
