const { sequelize } = require('./models');

async function cleanupBackups() {
    try {
        await sequelize.authenticate();
        console.log('Database connected.');

        // Drop backup tables if they exist
        await sequelize.query('DROP TABLE IF EXISTS `Users_backup`');
        await sequelize.query('DROP TABLE IF EXISTS `Products_backup`');

        console.log('Backup tables dropped.');

        // Now try to sync
        console.log('Syncing database...');
        await sequelize.sync({ alter: true });
        console.log('Database synced successfully.');

    } catch (error) {
        console.error('Error during cleanup/sync:', error);
    } finally {
        await sequelize.close();
    }
}

cleanupBackups();
