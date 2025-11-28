const { sequelize } = require('./config/db');

async function syncDatabase() {
    try {
        console.log('Starting database sync...');

        // Force sync to recreate tables (use with caution in production)
        // Using alter to update existing schema without data loss
        await sequelize.sync({ alter: true });

        console.log('✓ Database synced successfully!');
        console.log('New fields added:');
        console.log('  - Invoice: status, final_amount, cancelled_at, cancelled_by');
        console.log('  - PaymentHistory: new table created');

        // Close connection
        await sequelize.close();
        console.log('Database connection closed.');

        process.exit(0);
    } catch (error) {
        console.error('❌ Error syncing database:');
        console.error(error.message);
        if (error.parent) {
            console.error('SQL Error:', error.parent.message);
        }
        process.exit(1);
    }
}

syncDatabase();
