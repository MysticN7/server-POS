// Import necessary libraries and modules
const Sale = require('../models/sale');
const Invoice = require('../models/invoice');

// Function to create a sale
const createSale = async (req, res) => {
    try {
        // Count the current number of documents in the Invoice collection
        const count = await Invoice.countDocuments();

        // Generate invoice number with 2-digit padding
        const invoiceNumber = (count + 1).toString().padStart(2, '0');

        // Create new sale invoice
        const newInvoice = new Invoice({
            invoiceNumber: invoiceNumber,
            ...req.body
        });

        await newInvoice.save();
        res.status(201).json({ message: 'Sale created successfully', newInvoice });
    } catch (error) {
        res.status(500).json({ message: 'Error creating sale', error });
    }
};

module.exports = {
    createSale,
    // Other functions...
};