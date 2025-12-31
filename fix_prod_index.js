require('dotenv').config();
const mongoose = require('mongoose');

const uri = process.env.MONGODB_URI;

if (!uri) {
    console.error('❌ MONGODB_URI is not defined in .env');
    process.exit(1);
}

async function fixIndex() {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(uri);
        console.log('✅ Connected.');

        const Product = require('./models/Product');

        console.log('Wait for connection to be ready...');
        // Access native driver collection
        const collection = mongoose.connection.db.collection('products');

        console.log('Listing indexes...');
        const indexes = await collection.indexes();
        indexes.forEach(idx => console.log(` - ${idx.name}`));

        // Look for sku index
        const skuIndex = indexes.find(i => i.key.sku);
        if (skuIndex) {
            console.log(`Found SKU index: ${skuIndex.name}. Dropping it...`);
            await collection.dropIndex(skuIndex.name);
            console.log('✅ Index dropped.');
        } else {
            console.log('SKU index not found?');
        }

        console.log('Updating existing documents with sku: null to unset them...');
        const result = await collection.updateMany(
            { sku: null },
            { $unset: { sku: "" } }
        );
        console.log(`✅ Modified ${result.modifiedCount} documents.`);

        console.log('Re-creating correct index via Mongoose (by ensuring indexes)...');
        // Mongoose syncIndexes or just let the app start
        // We can force it here:
        await Product.syncIndexes();
        console.log('✅ Indexes synced.');

        process.exit(0);
    } catch (err) {
        console.error('❌ Failed:', err);
        process.exit(1);
    }
}

fixIndex();
