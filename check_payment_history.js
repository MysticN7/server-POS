const mongoose = require('mongoose');
const PaymentHistory = require('./models/PaymentHistory');
const Invoice = require('./models/Invoice');
require('dotenv').config();

const checkHistory = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/pos_db');
        console.log('Connected to DB');

        const count = await PaymentHistory.countDocuments();
        const invoiceCount = await Invoice.countDocuments();
        console.log(`Total PaymentHistory records: ${count}`);
        console.log(`Total Invoice records: ${invoiceCount}`);

        if (count > 0) {
            const records = await PaymentHistory.find().sort({ createdAt: -1 }).limit(5);
            console.log('Recent 5 records:', JSON.stringify(records, null, 2));

            // Check references
            const first = records[0];
            const invoice = await Invoice.findById(first.invoice);
            console.log('Linked Invoice for first record:', invoice ? 'Found' : 'Not Found');
        } else {
            console.log('No records found in PaymentHistory collection.');
        }

    } catch (err) {
        console.error('Error:', err);
    } finally {
        await mongoose.disconnect();
    }
};

checkHistory();
