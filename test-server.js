// Test script to identify server startup error
try {
    console.log('Step 1: Loading dotenv...');
    require('dotenv').config();

    console.log('Step 2: Loading express...');
    const express = require('express');

    console.log('Step 3: Loading models...');
    const { sequelize } = require('./models');

    console.log('Step 4: All modules loaded successfully!');
    console.log('Starting server test...');

    const app = express();
    const PORT = 5000;

    app.get('/', (req, res) => {
        res.send('Test server running');
    });

    app.listen(PORT, () => {
        console.log(`✅ Test server running on port ${PORT}`);
    });

} catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Stack:', error.stack);
}
