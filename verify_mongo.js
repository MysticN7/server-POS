require('dotenv').config();
const mongoose = require('mongoose');

const uri = process.env.MONGODB_URI;

if (!uri) {
    console.error('❌ MONGODB_URI is not defined in .env');
    process.exit(1);
}

console.log('Use MONGODB_URI:', uri.replace(/:([^:@]{1,})@/, ':****@')); // Hide password

async function verify() {
    try {
        console.log('Connecting to MongoDB Atlas...');
        await mongoose.connect(uri);
        console.log('✅ Connected successfully!');

        const admin = new mongoose.mongo.Admin(mongoose.connection.db);
        const buildInfo = await admin.buildInfo();
        console.log(`✅ MongoDB Version: ${buildInfo.version}`);

        console.log('Checking database stats...');
        const collections = await mongoose.connection.db.listCollections().toArray();
        console.log(`✅ Found ${collections.length} collections:`);
        collections.forEach(c => console.log(`   - ${c.name}`));

        process.exit(0);
    } catch (err) {
        console.error('❌ Connection failed:', err.message);
        process.exit(1);
    }
}

verify();
