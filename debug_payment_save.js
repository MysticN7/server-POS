const mongoose = require('mongoose');
const PaymentHistory = require('./models/PaymentHistory');
const Invoice = require('./models/Invoice');
require('dotenv').config();

const debugSave = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/pos-db');
        console.log('Connected to DB (pos-db)');

        // 1. Find an invoice
        const invoice = await Invoice.findOne();
        if (!invoice) {
            console.log('No invoices found to test with.');
            return;
        }
        console.log(`Found Invoice: ${invoice.invoiceNumber} (_id: ${invoice._id})`);

        // 2. Create PaymentHistory
        const payment = new PaymentHistory({
            invoice: invoice._id,
            amount: 10,
            paymentMethod: 'Cash',
            note: 'Debug Script Test'
        });

        console.log('Attempting to save PaymentHistory...');
        const saved = await payment.save();
        console.log('Saved successfully:', saved);

        // 3. Verify read
        const found = await PaymentHistory.findById(saved._id).populate('invoice');
        console.log('Read back record:', found);
        console.log('Linked Invoice Number:', found.invoice ? found.invoice.invoiceNumber : 'NULL');

    } catch (err) {
        console.error('DEBUG ERROR:', err);
    } finally {
        await mongoose.disconnect();
    }
};

debugSave();
