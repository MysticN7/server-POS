'use strict';

module.exports = {
    up: async (queryInterface, Sequelize) => {
        // Add new columns to Customers table
        await queryInterface.addColumn('Customers', 'email', {
            type: Sequelize.STRING,
            allowNull: true
        });

        await queryInterface.addColumn('Customers', 'customer_type', {
            type: Sequelize.ENUM('regular', 'vip', 'wholesale'),
            defaultValue: 'regular'
        });

        await queryInterface.addColumn('Customers', 'notes', {
            type: Sequelize.TEXT,
            allowNull: true
        });

        await queryInterface.addColumn('Customers', 'total_purchases', {
            type: Sequelize.DECIMAL(10, 2),
            defaultValue: 0
        });

        await queryInterface.addColumn('Customers', 'total_visits', {
            type: Sequelize.INTEGER,
            defaultValue: 0
        });

        await queryInterface.addColumn('Customers', 'last_visit_date', {
            type: Sequelize.DATE,
            allowNull: true
        });

        await queryInterface.addColumn('Customers', 'outstanding_balance', {
            type: Sequelize.DECIMAL(10, 2),
            defaultValue: 0
        });
    },

    down: async (queryInterface, Sequelize) => {
        // Remove the added columns
        await queryInterface.removeColumn('Customers', 'email');
        await queryInterface.removeColumn('Customers', 'customer_type');
        await queryInterface.removeColumn('Customers', 'notes');
        await queryInterface.removeColumn('Customers', 'total_purchases');
        await queryInterface.removeColumn('Customers', 'total_visits');
        await queryInterface.removeColumn('Customers', 'last_visit_date');
        await queryInterface.removeColumn('Customers', 'outstanding_balance');
    }
};
