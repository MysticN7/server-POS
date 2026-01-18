sai
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

// Create Legacy/Manual Invoice
exports.createLegacySale = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const { invoice_number, customer_name, total_due, note } = req.body;
        const user_id = req.user.id;

        // Validation
        if (!invoice_number || !total_due) {
            return res.status(400).json({ message: 'Invoice Number and Total Due are required' });
        }

        // Check if invoice number already exists
        const existing = await Invoice.findOne({ invoiceNumber: invoice_number });
        if (existing) {
            return res.status(400).json({ message: 'Invoice number already exists' });
        }

        // Handle Customer (Find by name or create generic)
        let customer = await Customer.findOne({ name: customer_name });
        if (!customer && customer_name) {
            customer = new Customer({
                name: customer_name,
                address: 'N/A (Legacy)',
                phone: 'N/A'
            });
            await customer.save({ session });
        } else if (!customer) {
            // Fallback to Walk-in if no name provided
            customer = await Customer.findOne({ name: 'Walk-in Customer' });
        }

        // Create Invoice
        const invoice = new Invoice({
            invoiceNumber: invoice_number,
            customer: customer._id,
            totalAmount: total_due,
            paidAmount: 0,
            dueAmount: total_due,
            paymentMethod: 'Cash', // Default for legacy record
            status: 'PENDING',
            note: note || 'Legacy/Paper Invoice Entry',
            createdBy: user_id
        });

        await invoice.save({ session });

        // Create a dummy item to represent the balance
        const item = new InvoiceItem({
            invoice: invoice._id,
            itemName: 'Previous Balance / Legacy Due',
            quantity: 1,
            unitPrice: total_due,
            totalPrice: total_due
        });
        await item.save({ session });

        await session.commitTransaction();

        const payload = await buildInvoicePayload(invoice._id);
        res.json({ message: 'Legacy invoice created', invoice: payload });

        logAction('CREATE_LEGACY', `Created legacy invoice: ${invoice_number} (Due: ${total_due})`, user_id, invoice._id, 'Invoice', req.ip);

    } catch (err) {
        await session.abortTransaction();
        console.error(err);
        res.status(500).json({ message: 'Server Error' });
    } finally {
        session.endSession();
    }
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
        _id: invoice._id, // Ensure _id is available for backward compatibility
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
            if (!item.name || item.unit_price === undefined || item.unit_price === null || !item.quantity) {
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

        // --- NEW INVOICE NUMBER LOGIC (Sequential: 01, 02, 03...) ---
        
        // 1. Find the invoice with the HIGHEST invoice number that isn't TEMP
        // We use collation to sort strings numerically ("10" comes after "2")
        const lastInvoice = await Invoice.findOne({ 
             invoiceNumber: { $regex: /^\d+$/ } // Only look for numbers, ignore "TEMP-"
        })
        .sort({ createdAt: -1 }) // Sort by newest date as a fallback
        .collation({ locale: "en_US", numericOrdering: true }) // CRITICAL: Sorts "2" < "10"
        .session(session);

        let nextNumber = 1;
        if (lastInvoice && lastInvoice.invoiceNumber) {
            const lastNum = parseInt(lastInvoice.invoiceNumber, 10);
            if (!isNaN(lastNum)) {
                nextNumber = lastNum + 1;
            }
        }

        // Format as "01", "02", ... "10"
        const uniqueInvoiceNumber = String(nextNumber).padStart(2, '0');

        // Double check collision (Just in case two people click save at exact same ms)
        const checkCollision = await Invoice.findOne({ invoiceNumber: uniqueInvoiceNumber }).session(session);
        if (checkCollision) {
             // If collision, just add random digits to save the sale (Emergency fallback)
             // Or you could throw error, but this saves the sale.
             uniqueInvoiceNumber = `${uniqueInvoiceNumber}-${Date.now().toString().slice(-4)}`;
        }

        // Create Invoice
        const invoice = new Invoice({
            invoiceNumber: uniqueInvoiceNumber,
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

        // Create Invoice Items
        const itemsWithInvoiceId = invoiceItemsData.map(item => ({
            ...item,
            invoice: invoice._id
        }));

        await InvoiceItem.insertMany(itemsWithInvoiceId, { session });

        // Create Payment History for initial payment
        if (paid_amount > 0) {
            const payment = new PaymentHistory({
                invoice: invoice._id,
                amount: paid_amount,
                paymentMethod: payment_method || 'Cash',
                note: 'Initial Payment'
            });
            await payment.save({ session });
        }

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
        // Better error message for frontend
        if (err.code === 11000) {
             res.status(409).json({ message: 'Invoice number conflict. Please try again.', error: err.message });
        } else {
             res.status(500).json({ message: 'Server Error', error: err.message });
        }
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
        let { startDate, endDate, search } = req.query;

        // PERMISSION CHECK: Restrict to "Today" if user lacks VIEW_MONTHLY_SALES
        const canViewHistory = req.user.role === 'ADMINISTRATIVE' || (req.user.permissions && req.user.permissions.includes('VIEW_MONTHLY_SALES'));
        const isSearching = search && search.trim().length > 0;

        // Check if query is within a single day (approx 24h)
        let isSingleDay = false;
        if (startDate && endDate) {
            // Frontend sends start at 00:00 and end at 23:59, so diff is ~24h
            const diff = new Date(endDate).getTime() - new Date(startDate).getTime();
            isSingleDay = diff <= 86500000; // 24h + small buffer
        }

        // Rule: If no monthly permission, restrict access unless:
        // 1. It's a search
        // 2. It's a single day query (<= 24h)
        if (!canViewHistory && !isSearching && !isSingleDay) {
            const today = new Date();
            // Create start of today (00:00:00)
            const startOfToday = new Date(today);
            startOfToday.setHours(0, 0, 0, 0);

            // Create end of today (23:59:59)
            const endOfToday = new Date(today);
            endOfToday.setHours(23, 59, 59, 999);

            startDate = startOfToday.toISOString();
            endDate = endOfToday.toISOString();
        }

        let query = { status: { $ne: 'CANCELLED' } };

        // Date range filter
        if (startDate && endDate) {
            const start = new Date(startDate);
            const end = new Date(endDate);

            // If simple date string provided (length 10 e.g. "YYYY-MM-DD")
            if (startDate.length === 10) start.setHours(0, 0, 0, 0);
            if (endDate.length === 10) end.setHours(23, 59, 59, 999);

            query.createdAt = { $gte: start, $lte: end };
        }

        let salesQuery = Invoice.find(query);

        // Search functionality
        if (search) {
            const customers = await Customer.find({
                $or: [
                    { name: { $regex: search, $options: 'i' } },
                    { phone: { $regex: search, $options: 'i' } }
                ]
            }).select('_id');

            const customerIds = customers.map(c => c._id);

            // Combine with existing query using $and to ensure status/date filters apply
            // But search conditions themselves are OR (InvoiceNumber OR CustomerName OR CustomerPhone)
            query.$or = [
                { customer: { $in: customerIds } },
                { invoiceNumber: { $regex: search, $options: 'i' } }
            ];
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
        // PERMISSION CHECK
        if (req.user.role !== 'ADMINISTRATIVE' && (!req.user.permissions || !req.user.permissions.includes('DELETE_SALES'))) {
            return res.status(403).json({ message: 'Access denied. You do not have permission to delete invoices.' });
        }

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
    try {
        const sale = await Invoice.findById(req.params.id);

        if (!sale) {
            return res.status(404).json({ message: 'Invoice not found' });
        }

        const { amount, payment_method, note } = req.body;

        if (!amount || amount <= 0) {
            return res.status(400).json({ message: 'Invalid payment amount' });
        }

        // Create payment history record
        console.log('Creating PaymentHistory record...');
        const payment = new PaymentHistory({
            invoice: sale._id,
            amount: amount,
            paymentMethod: payment_method || sale.paymentMethod,
            note: note
        });

        await payment.save();
        console.log('PaymentHistory saved:', payment._id);

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

        await sale.save();

        res.json({ message: 'Payment added successfully', invoice: sale });
    } catch (err) {
        console.error('Payment Error:', err);
        res.status(500).json({ message: 'Server Error' });
    }
};

// Get recent payment history
exports.getPaymentHistory = async (req, res) => {
    try {
        const history = await PaymentHistory.find()
            .sort({ createdAt: -1 })
            .limit(50)
            .populate({
                path: 'invoice',
                select: 'invoiceNumber customerName',
                populate: {
                    path: 'customer',
                    select: 'name phone'
                }
            });

        res.json(history);
    } catch (err) {
        console.error('Fetch History Error:', err);
        res.status(500).json({ message: 'Server Error' });
    }
};

// Update payment amount
exports.updatePayment = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const { id } = req.params;
        const { amount, note, payment_method, invoice_number } = req.body;
        const user = req.user;

        // PERMISSION CHECK
        const canEdit = user.role === 'ADMINISTRATIVE' || (user.permissions && user.permissions.includes('EDIT_DUE'));
        if (!canEdit) {
            await session.abortTransaction();
            return res.status(403).json({ message: 'Access denied. You do not have permission to edit payments.' });
        }

        const payment = await PaymentHistory.findById(id).session(session);
        if (!payment) {
            await session.abortTransaction();
            return res.status(404).json({ message: 'Payment record not found' });
        }

        // Find Current Invoice
        const currentInvoice = await Invoice.findById(payment.invoice).session(session);
        if (!currentInvoice) {
            await session.abortTransaction();
            return res.status(404).json({ message: 'Associated invoice not found' });
        }

        // Check if Invoice is being changed
        let targetInvoice = currentInvoice;
        let isInvoiceChanged = false;

        if (invoice_number && invoice_number !== currentInvoice.invoiceNumber) {
            // User wants to move payment to another invoice
            const newInvoice = await Invoice.findOne({ invoiceNumber: invoice_number }).session(session);
            if (!newInvoice) {
                await session.abortTransaction();
                return res.status(404).json({ message: `Invoice #${invoice_number} not found` });
            }
            targetInvoice = newInvoice;
            isInvoiceChanged = true;
        }

        const oldAmount = payment.amount;
        const newAmount = parseFloat(amount);

        if (isNaN(newAmount) || newAmount <= 0) {
            await session.abortTransaction();
            return res.status(400).json({ message: 'Amount must be greater than 0' });
        }

        if (isInvoiceChanged) {
            // 1. Revert Old Invoice
            // Ensure paidAmount doesn't go below 0
            currentInvoice.paidAmount = Math.max(0, currentInvoice.paidAmount - oldAmount);

            const currentFinal = currentInvoice.totalAmount - (currentInvoice.discount || 0);
            currentInvoice.dueAmount = Math.max(0, currentFinal - currentInvoice.paidAmount);

            // Update Old Invoice Status
            if (currentInvoice.paidAmount >= currentFinal) currentInvoice.status = 'PAID';
            else if (currentInvoice.paidAmount > 0) currentInvoice.status = 'PARTIAL';
            else currentInvoice.status = 'PENDING';

            await currentInvoice.save({ session });

            // 2. Apply to New Invoice (targetInvoice)
            targetInvoice.paidAmount += newAmount; // Add NEW amount to new invoice
            const targetFinal = targetInvoice.totalAmount - (targetInvoice.discount || 0);
            targetInvoice.dueAmount = Math.max(0, targetFinal - targetInvoice.paidAmount);

            // Update New Invoice Status
            if (targetInvoice.paidAmount >= targetFinal) targetInvoice.status = 'PAID';
            else if (targetInvoice.paidAmount > 0) targetInvoice.status = 'PARTIAL';
            else targetInvoice.status = 'PENDING';

            await targetInvoice.save({ session });

            // Update Payment Record
            payment.invoice = targetInvoice._id;

        } else {
            // Same Invoice - Just adjust diff
            const amountDiff = newAmount - oldAmount;

            // If amountDiff is negative (newAmount < oldAmount), paidAmount decreases.
            // We ensure it doesn't drop below zero to avoid schema validation errors.
            targetInvoice.paidAmount = Math.max(0, targetInvoice.paidAmount + amountDiff);

            const finalAmount = targetInvoice.totalAmount - (targetInvoice.discount || 0);
            targetInvoice.dueAmount = Math.max(0, finalAmount - targetInvoice.paidAmount);

            // Update Status
            if (targetInvoice.paidAmount >= finalAmount) {
                targetInvoice.status = 'PAID';
            } else if (targetInvoice.paidAmount > 0) {
                targetInvoice.status = 'PARTIAL';
            } else {
                targetInvoice.status = 'PENDING';
            }

            await targetInvoice.save({ session });
        }

        // Update Payment Record fields
        payment.amount = newAmount;
        if (note !== undefined) payment.note = note;
        if (payment_method) payment.paymentMethod = payment_method;

        await payment.save({ session });

        await session.commitTransaction();

        const logMsg = isInvoiceChanged
            ? `Moved payment from Inv #${currentInvoice.invoiceNumber} to #${targetInvoice.invoiceNumber} & updated: ${oldAmount} -> ${newAmount}`
            : `Updated payment for invoice ${targetInvoice.invoiceNumber}: ${oldAmount} -> ${newAmount}`;

        logAction('UPDATE_PAYMENT', logMsg, user.id, payment._id, 'PaymentHistory', req.ip);

        res.json({ message: 'Payment updated successfully', payment, invoice: targetInvoice });

    } catch (err) {
        await session.abortTransaction();
        console.error('Update Payment Error:', err);
        // Return actual error message for debugging if it's a validation error
        const errorMessage = err.name === 'ValidationError' ? err.message : 'Server Error';
        res.status(500).json({ message: errorMessage, error: err.toString() });
    } finally {
        session.endSession();
    }
};

// Delete payment
exports.deletePayment = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const { id } = req.params;
        const user = req.user;

        // PERMISSION CHECK
        const canDelete = user.role === 'ADMINISTRATIVE' || (user.permissions && user.permissions.includes('DELETE_DUE'));
        if (!canDelete) {
            await session.abortTransaction();
            return res.status(403).json({ message: 'Access denied. You do not have permission to delete payments.' });
        }

        const payment = await PaymentHistory.findById(id).session(session);
        if (!payment) {
            await session.abortTransaction();
            return res.status(404).json({ message: 'Payment record not found' });
        }

        const invoice = await Invoice.findById(payment.invoice).session(session);

        if (invoice) {
            // Revert Invoice Paid Amount
            // Ensure paidAmount doesn't go below 0
            invoice.paidAmount = Math.max(0, invoice.paidAmount - payment.amount);

            // Recalculate Due
            const finalAmount = invoice.totalAmount - (invoice.discount || 0);
            invoice.dueAmount = Math.max(0, finalAmount - invoice.paidAmount);

            // Update Status
            if (invoice.paidAmount >= finalAmount) {
                invoice.status = 'PAID';
            } else if (invoice.paidAmount > 0) {
                invoice.status = 'PARTIAL';
            } else {
                invoice.status = 'PENDING';
            }

            await invoice.save({ session });
        }

        await PaymentHistory.findByIdAndDelete(id).session(session);

        await session.commitTransaction();

        logAction('DELETE_PAYMENT', `Deleted payment of ${payment.amount} for invoice ${invoice ? invoice.invoiceNumber : 'Unknown'}`, user.id, payment._id, 'PaymentHistory', req.ip);

        res.json({ message: 'Payment deleted successfully', invoice });

    } catch (err) {
        await session.abortTransaction();
        console.error('Delete Payment Error:', err);
        // Return actual error message for debugging
        const errorMessage = err.name === 'ValidationError' ? err.message : 'Server Error';
        res.status(500).json({ message: errorMessage, error: err.toString() });
    } finally {
        session.endSession();
    }
};
