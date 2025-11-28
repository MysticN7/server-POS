const { sequelize } = require('./config/db');
const Sequelize = require('sequelize');

async function runMigration() {
    try {
        console.log('Starting migration...');

        const queryInterface = sequelize.getQueryInterface();

        // Check if columns already exist
        const tableDescription = await queryInterface.describeTable('Customers');

        // Add email column if it doesn't exist
        if (!tableDescription.email) {
            console.log('Adding email column...');
            await queryInterface.addColumn('Customers', 'email', {
                type: Sequelize.STRING,
                allowNull: true
            });
        }

        // Add customer_type column if it doesn't exist
        if (!tableDescription.customer_type) {
            console.log('Adding customer_type column...');
            await queryInterface.addColumn('Customers', 'customer_type', {
                type: Sequelize.STRING,
                defaultValue: 'regular'
            });
        }

        // Add notes column if it doesn't exist
        if (!tableDescription.notes) {
            console.log('Adding notes column...');
            await queryInterface.addColumn('Customers', 'notes', {
                type: Sequelize.TEXT,
                allowNull: true
            });
        }

        // Add total_purchases column if it doesn't exist
        if (!tableDescription.total_purchases) {
            console.log('Adding total_purchases column...');
            await queryInterface.addColumn('Customers', 'total_purchases', {
                type: Sequelize.DECIMAL(10, 2),
                defaultValue: 0
            });
        }

        // Add total_visits column if it doesn't exist
        if (!tableDescription.total_visits) {
            console.log('Adding total_visits column...');
            await queryInterface.addColumn('Customers', 'total_visits', {
                type: Sequelize.INTEGER,
                defaultValue: 0
            });
        }

        // Add last_visit_date column if it doesn't exist
        if (!tableDescription.last_visit_date) {
            console.log('Adding last_visit_date column...');
            await queryInterface.addColumn('Customers', 'last_visit_date', {
                type: Sequelize.DATE,
                allowNull: true
            });
        }

        // Add outstanding_balance column if it doesn't exist
        if (!tableDescription.outstanding_balance) {
            console.log('Adding outstanding_balance column...');
            await queryInterface.addColumn('Customers', 'outstanding_balance', {
                type: Sequelize.DECIMAL(10, 2),
                defaultValue: 0
            });
        }

        console.log('Migration completed successfully!');
        process.exit(0);
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
}

runMigration();
