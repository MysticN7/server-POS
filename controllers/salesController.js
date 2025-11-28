const Invoice = require('../models/Invoice');
const InvoiceItem = require('../models/InvoiceItem');
const Customer = require('../models/Customer');
const User = require('../models/User');
const PaymentHistory = require('../models/PaymentHistory');
const Product = require('../models/Product');
const mongoose = require('mongoose');

// Create a new Sale (Invoice)
exports.createSale = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        console.log('Create Sale Request Body:', JSON.stringify(req.body, null, 2));
        console.log('Create Sale User:', req.user);

        const { customer_id, items, discount, paid_amount, payment_method, note } = req.body;
        const user_id = req.user.id;

        // Calculate totals
        let total_amount = 0;
        const invoiceItemsData = [];

        for (const item of items) {
            if (!item.name || !item.unit_price || !item.quantity) {
                await session.abortTransaction();
                return res.status(400).json({ message: 'Each item must include name, unit_price, and quantity' });
            }

            const subtotal = item.unit_price * item.quantity;
            total_amount += subtotal;

            // Decrement Stock
            if (item.product_id) {
                await Product.findByIdAndUpdate(
                    item.product_id,
                    { $inc: { stockQuantity: -item.quantity } },
                    { session }
                );
            }

            invoiceItemsData.push({
                itemName: item.name,
                quantity: item.quantity,
                unitPrice: item.unit_price,
                totalPrice: subtotal,
                isPrescriptionRequired: !!item.prescription_data,
                prescriptionData: item.prescription_data || null,
                product: item.product_id || null
            });
        }

        const final_amount = total_amount - (discount || 0);

        // Create Invoice
        const invoice = new Invoice({
            invoiceNumber: `TEMP-${Date.now()}`,
            customer: customer_id,
            totalAmount: total_amount,
            discount: discount || 0,
            paidAmount: paid_amount || 0,
            dueAmount: final_amount - (paid_amount || 0),
            paymentMethod: payment_method,
            status: paid_amount >= final_amount ? 'PAID' : (paid_amount > 0 ? 'PARTIAL' : 'PENDING'),
            note: note,
            createdBy: user_id
        });

        await invoice.save({ session });

        // Update invoice number to be sequential
        invoice.invoiceNumber = invoice._id.toString().slice(-6).toUpperCase();
        await invoice.save({ session });

        // Create Invoice Items
        const itemsWithInvoiceId = invoiceItemsData.map(item => ({
            ...item,
            invoice: invoice._id
        }));

        await InvoiceItem.insertMany(itemsWithInvoiceId, { session });

        await session.commitTransaction();

        res.json({ message: 'Sale completed successfully', invoice });
    } catch (err) {
        await session.abortTransaction();
        console.error('=== Sales Creation Error ===');
        console.error('Error message:', err.message);
        console.error('Error stack:', err.stack);
        res.status(500).json({ message: 'Server Error', error: err.message });
    } finally {
        session.endSession();
    }
};

// Get all sales
exports.getSales = async (req, res) => {
    try {
        const sales = await Invoice.find()
            .populate('customer', 'name phone')
            .populate('createdBy', 'username')
            .sort({ createdAt: -1 });
        res.json(sales);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server Error' });
    }
};

// Get single sale by ID
exports.getSaleById = async (req, res) => {
    try {
        const sale = await Invoice.findById(req.params.id)
            .populate('customer')
            .populate('createdBy', 'username email');

        if (!sale) {
            return res.status(404).json({ message: 'Invoice not found' });
        }

        // Get invoice items
        const items = await InvoiceItem.find({ invoice: sale._id });

        // Get payment history
        const payments = await PaymentHistory.find({ invoice: sale._id })
            .sort({ createdAt: -1 });

        res.json({ ...sale.toObject(), items, payments });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server Error' });
    }
};

// Get sales by date range
exports.getSalesByDateRange = async (req, res) => {
    try {
        const { startDate, endDate, search } = req.query;

        let query = { status: { $ne: 'CANCELLED' } };

        // Date range filter
        if (startDate && endDate) {
            const start = new Date(startDate);
            start.setHours(0, 0, 0, 0);

            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);

            query.createdAt = { $gte: start, $lte: end };
        }

        let salesQuery = Invoice.find(query);

        // Customer search
        if (search) {
            const customers = await Customer.find({
                $or: [
                    { name: { $regex: search, $options: 'i' } },
                    { phone: { $regex: search, $options: 'i' } }
                ]
            }).select('_id');

            const customerIds = customers.map(c => c._id);
            query.customer = { $in: customerIds };
        }

        const sales = await Invoice.find(query)
            .populate('customer', 'name phone')
            .sort({ createdAt: -1 });

        // Calculate summary stats
        const summary = {
            totalSales: sales.reduce((sum, s) => sum + s.totalAmount, 0),
            totalCollected: sales.reduce((sum, s) => sum + s.paidAmount, 0),
            totalDue: sales.reduce((sum, s) => sum + s.dueAmount, 0),
            count: sales.length
        };

        res.json({ sales, summary });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server Error' });
    }
};

// Update sale
exports.updateSale = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const sale = await Invoice.findById(req.params.id).session(session);

        if (!sale) {
            await session.abortTransaction();
            return res.status(404).json({ message: 'Invoice not found' });
        }

        const { paid_amount, payment_method, note, items, discount } = req.body;

        // Update invoice basic fields
        if (paid_amount !== undefined) sale.paidAmount = paid_amount;
        if (payment_method) sale.paymentMethod = payment_method;
        if (note !== undefined) sale.note = note;
        if (discount !== undefined) sale.discount = discount;

        // Update items if provided
        let newTotalAmount = 0;

        if (items && Array.isArray(items)) {
            for (const item of items) {
                if (item.id) {
                    const quantity = item.quantity;
                    const unit_price = item.unit_price;
                    const subtotal = quantity * unit_price;

                    await InvoiceItem.findByIdAndUpdate(
                        item.id,
                        {
                            itemName: item.item_name,
                            quantity: quantity,
                            unitPrice: unit_price,
                            totalPrice: subtotal,
                            prescriptionData: item.prescription_data
                        },
                        { session }
                    );

                    newTotalAmount += subtotal;
                }
            }

            sale.totalAmount = newTotalAmount;
        }

        // Recalculate amounts
        const finalAmount = sale.totalAmount - (sale.discount || 0);
        sale.dueAmount = finalAmount - sale.paidAmount;

        // Update status
        if (sale.paidAmount >= finalAmount) {
            sale.status = 'PAID';
        } else if (sale.paidAmount > 0) {
            sale.status = 'PARTIAL';
        } else {
            sale.status = 'PENDING';
        }

        await sale.save({ session });
        await session.commitTransaction();

        res.json({ message: 'Invoice updated successfully', invoice: sale });
    } catch (err) {
        await session.abortTransaction();
        console.error(err);
        res.status(500).json({ message: 'Server Error' });
    } finally {
        session.endSession();
    }
};

// Soft delete sale
exports.deleteSale = async (req, res) => {
    try {
        const sale = await Invoice.findById(req.params.id);

        if (!sale) {
            return res.status(404).json({ message: 'Invoice not found' });
        }

        sale.status = 'CANCELLED';
        await sale.save();

        res.json({ message: 'Invoice cancelled successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server Error' });
    }
};

// Add payment to invoice
exports.addPayment = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const sale = await Invoice.findById(req.params.id).session(session);

        if (!sale) {
            await session.abortTransaction();
            return res.status(404).json({ message: 'Invoice not found' });
        }

        const { amount, payment_method, note } = req.body;

        if (!amount || amount <= 0) {
            await session.abortTransaction();
            return res.status(400).json({ message: 'Invalid payment amount' });
        }

        // Create payment history record
        const payment = new PaymentHistory({
            invoice: sale._id,
            amount: amount,
            paymentMethod: payment_method || sale.paymentMethod,
            note: note
        });

        await payment.save({ session });

        // Update invoice paid amount
        sale.paidAmount += amount;
        sale.dueAmount = (sale.totalAmount - sale.discount) - sale.paidAmount;

        // Update status
        const finalAmount = sale.totalAmount - (sale.discount || 0);
        if (sale.paidAmount >= finalAmount) {
            sale.status = 'PAID';
        } else if (sale.paidAmount > 0) {
            sale.status = 'PARTIAL';
        }

        await sale.save({ session });
        await session.commitTransaction();

        res.json({ message: 'Payment added successfully', invoice: sale });
    } catch (err) {
        await session.abortTransaction();
        console.error(err);
        res.status(500).json({ message: 'Server Error' });
    } finally {
        session.endSession();
    }
};
