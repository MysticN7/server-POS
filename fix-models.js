const { sequelize, BankTransaction, CashTransaction } = require('./models');

async function fixModels() {
    try {
        console.log('Fixing BankTransaction and CashTransaction models...');

        // Sync models with alter: true to update existing tables
        await BankTransaction.sync({ alter: true });
        console.log('✅ BankTransaction model synced');

        await CashTransaction.sync({ alter: true });
        console.log('✅ CashTransaction model synced');

        console.log('\n✅ All models fixed successfully!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error fixing models:', error);
        process.exit(1);
    }
}

fixModels();
