const Invoice = require('../models/Invoice');
const InvoiceItem = require('../models/InvoiceItem');
const Customer = require('../models/Customer');
const User = require('../models/User');
const PaymentHistory = require('../models/PaymentHistory');
const Product = require('../models/Product');
const mongoose = require('mongoose');
const { logAction } = require('./auditLogController');

const STATUS_LABELS = {
    PAID: 'Paid',
    PARTIAL: 'Partial',
    PENDING: 'Pending',
    CANCELLED: 'Cancelled'
};

const mapCustomer = (customerDoc) => {
    if (!customerDoc) return null;
    const customer = customerDoc.toObject ? customerDoc.toObject() : customerDoc;
    return {
        id: customer._id,
        name: customer.name,
        phone: customer.phone,
        address: customer.address || '',
        email: customer.email || ''
    };
};

const mapInvoiceItem = (itemDoc) => {
    const item = itemDoc.toObject ? itemDoc.toObject() : itemDoc;
    return {
        id: item._id,
        product_id: item.product || null,
        item_name: item.itemName || item.item_name,
        quantity: item.quantity,
        unit_price: item.unitPrice ?? item.unit_price,
        subtotal: item.totalPrice ?? item.subtotal ?? ((item.unitPrice || 0) * (item.quantity || 0)),
        prescription_data: item.prescriptionData ?? item.prescription_data ?? null
    };
};

const mapPayment = (paymentDoc) => {
    const payment = paymentDoc.toObject ? paymentDoc.toObject() : paymentDoc;
    return {
        id: payment._id,
        amount: payment.amount,
        payment_method: payment.paymentMethod || payment.payment_method,
        payment_date: payment.createdAt || payment.payment_date,
        notes: payment.note || payment.notes || '',
        processor: payment.processor || null
    };
};

const mapUser = (userDoc) => {
    if (!userDoc) return null;
    const user = userDoc.toObject ? userDoc.toObject() : userDoc;
    return {
        id: user._id,
        name: user.username || user.name || 'System User',
        email: user.email
    };
};

const formatInvoice = (invoiceDoc, { includeCustomer = false, includeUser = false, items = null, payments = null } = {}) => {
    const invoice = invoiceDoc.toObject ? invoiceDoc.toObject() : invoiceDoc;
    const totalAmount = Number(invoice.totalAmount || invoice.total_amount || 0);
    const discount = Number(invoice.discount || 0);
    const finalAmount = totalAmount - discount;
    const paidAmount = Number(invoice.paidAmount || invoice.paid_amount || 0);
    const dueAmount = invoice.dueAmount !== undefined ? Number(invoice.dueAmount) : finalAmount - paidAmount;

    const formatted = {
        id: invoice._id,
        invoice_number: invoice.invoiceNumber || invoice.invoice_number,
        total_amount: totalAmount,
        final_amount: finalAmount,
        paid_amount: paidAmount,
        due_amount: dueAmount,
        discount,
        status: STATUS_LABELS[invoice.status] || invoice.status || 'Pending',
        payment_method: invoice.paymentMethod || invoice.payment_method || 'Cash',
        note: invoice.note || '',
        createdAt: invoice.createdAt,
        updatedAt: invoice.updatedAt
    };

    if (includeCustomer) {
        formatted.Customer = mapCustomer(invoice.customer);
    }

    if (includeUser) {
        formatted.User = mapUser(invoice.createdBy);
    }

    if (items) {
        formatted.InvoiceItems = items.map(mapInvoiceItem);
    }

    if (payments) {
        formatted.PaymentHistories = payments.map(mapPayment);
    }

    return formatted;
};

const buildInvoicePayload = async (invoiceId, options = {}) => {
    const invoice = await Invoice.findById(invoiceId)
        .populate('customer', 'name phone address email')
        .populate('createdBy', 'username email');

    if (!invoice) return null;

    const [items, payments] = await Promise.all([
        InvoiceItem.find({ invoice: invoice._id }),
        PaymentHistory.find({ invoice: invoice._id }).sort({ createdAt: -1 })
    ]);

    return formatInvoice(invoice, {
        includeCustomer: true,
        includeUser: true,
        items,
        payments,
        ...options
    });
};

// Create a new Sale (Invoice)
exports.createSale = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        console.log('Create Sale Request Body:', JSON.stringify(req.body, null, 2));
        console.log('Create Sale User:', req.user);

        const { customer_id, items, discount, paid_amount, payment_method, note } = req.body;
        const user_id = req.user.id;

        if (!items || !Array.isArray(items) || items.length === 0) {
            await session.abortTransaction();
            return res.status(400).json({ message: 'Cart items are required to create a sale' });
        }

        let resolvedCustomerId = customer_id;

        if (!resolvedCustomerId) {
            // Ensure a fallback "Walk-in Customer" always exists (no phone)
            const walkInFilter = { name: 'Walk-in Customer' };
            let walkInCustomer = await Customer.findOne(walkInFilter).session(session);

            if (!walkInCustomer) {
                walkInCustomer = new Customer({
                    name: 'Walk-in Customer',
                    address: 'N/A'
                });
                await walkInCustomer.save({ session });
            }

            resolvedCustomerId = walkInCustomer._id;
        }

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
                console.log(`Attempting to reduce stock for product ${item.product_id} by ${item.quantity}`);
                const updatedProduct = await Product.findByIdAndUpdate(
                    item.product_id,
                    { $inc: { stockQuantity: -item.quantity } },
                    { session, new: true }
                );
                console.log(`Stock updated for ${item.product_id}. New stock: ${updatedProduct?.stockQuantity}`);
            } else {
                console.warn(`Skipping stock reduction for item ${item.name} (No product_id)`);
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
            customer: resolvedCustomerId,
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

        // Update invoice number to be sequential and padded (e.g., 01, 02 ... 10)
        const count = await Invoice.countDocuments();
        invoice.invoiceNumber = String(count).padStart(2, '0');
        await invoice.save({ session });

        // Create Invoice Items
        const itemsWithInvoiceId = invoiceItemsData.map(item => ({
            ...item,
            invoice: invoice._id
        }));

        await InvoiceItem.insertMany(itemsWithInvoiceId, { session });

        await session.commitTransaction();

        const payload = await buildInvoicePayload(invoice._id);

        res.json({ message: 'Sale completed successfully', invoice: payload });

        // Log action
        logAction('CREATE_SALE', `Created invoice: ${invoice.invoiceNumber} (Amount: ${final_amount})`, user_id, invoice._id, 'Invoice', req.ip);
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
        const formatted = await Promise.all(
            sales.map(async (sale) => formatInvoice(sale, { includeCustomer: true, includeUser: true }))
        );
        res.json(formatted);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server Error' });
    }
};

// Get single sale by ID
exports.getSaleById = async (req, res) => {
    try {
        const payload = await buildInvoicePayload(req.params.id);

        if (!payload) {
            return res.status(404).json({ message: 'Invoice not found' });
        }

        res.json(payload);
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
            const end = new Date(endDate);

            // Only override time if simple date string provided (length 10 e.g. "YYYY-MM-DD")
            if (startDate.length === 10) start.setHours(0, 0, 0, 0);
            if (endDate.length === 10) end.setHours(23, 59, 59, 999);

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
            .populate('customer', 'name phone address')
            .populate('createdBy', 'username email')
            .sort({ createdAt: -1 });

        const formattedSales = sales.map((sale) =>
            formatInvoice(sale, { includeCustomer: true, includeUser: true })
        );

        const summary = {
            totalSales: formattedSales.reduce((sum, s) => sum + s.total_amount, 0),
            totalCollected: formattedSales.reduce((sum, s) => sum + s.paid_amount, 0),
            totalDue: formattedSales.reduce((sum, s) => sum + s.due_amount, 0),
            count: formattedSales.length
        };

        res.json({ sales: formattedSales, summary });
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

        // Log action
        logAction('CANCEL_SALE', `Cancelled invoice: ${sale.invoiceNumber}`, req.user.id, sale._id, 'Invoice', req.ip);
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
