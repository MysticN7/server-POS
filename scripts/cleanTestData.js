const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const Invoice = require('../models/Invoice');
const PaymentHistory = require('../models/PaymentHistory');
const JobCard = require('../models/JobCard');
const CashTransaction = require('../models/CashTransaction');
const BankTransaction = require('../models/BankTransaction');

// Load env vars
dotenv.config({ path: path.join(__dirname, '../.env') });

const cleanData = async () => {
    try {
        if (!process.env.MONGODB_URI) {
            throw new Error('MONGODB_URI is not defined in .env');
        }

        console.log('Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected!');

        console.log('Cleaning up test data...');

        // 1. Delete Invoices/Sales
        const invoiceResult = await Invoice.deleteMany({});
        console.log(`Deleted ${invoiceResult.deletedCount} invoices.`);

        // 2. Delete Payment Histories (Due Collections)
        const paymentHistoryResult = await PaymentHistory.deleteMany({});
        console.log(`Deleted ${paymentHistoryResult.deletedCount} payment history records.`);

        // 3. Delete Job Cards
        const jobCardResult = await JobCard.deleteMany({});
        console.log(`Deleted ${jobCardResult.deletedCount} job cards.`);

        // 4. Delete Cash Transactions (Financial records of sales)
        const cashTxResult = await CashTransaction.deleteMany({});
        console.log(`Deleted ${cashTxResult.deletedCount} cash transactions.`);

        // 5. Delete Bank Transactions
        const bankTxResult = await BankTransaction.deleteMany({});
        console.log(`Deleted ${bankTxResult.deletedCount} bank transactions.`);

        console.log('✅ Data cleanup complete! The system is now fresh (excluding master data like Products/Users/Customers).');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error cleaning data:', error);
        process.exit(1);
    }
};

cleanData();
