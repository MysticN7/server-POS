const Customer = require('../models/Customer');
const { logAction } = require('./auditLogController');

exports.getAllCustomers = async (req, res) => {
    try {
        const { search } = req.query;
        let query = {};

        if (search) {
            query = {
                $or: [
                    { name: { $regex: search, $options: 'i' } },
                    { phone: { $regex: search, $options: 'i' } },
                    { email: { $regex: search, $options: 'i' } }
                ]
            };
        }

        const customers = await Customer.find(query).sort({ createdAt: -1 });
        res.json(customers);
    } catch (error) {
        console.error('Error fetching customers:', error);
        res.status(500).json({ message: error.message });
    }
};

exports.getCustomerById = async (req, res) => {
    try {
        const customer = await Customer.findById(req.params.id);
        if (!customer) {
            return res.status(404).json({ message: 'Customer not found' });
        }
        res.json(customer);
    } catch (error) {
        console.error('Error fetching customer:', error);
        res.status(500).json({ message: error.message });
    }
};

exports.createCustomer = async (req, res) => {
    try {
        const customer = new Customer(req.body);
        await customer.save();

        // Log action
        logAction('CREATE_CUSTOMER', `Created customer: ${customer.name}`, req.user?.id, customer._id, 'Customer', req.ip);

        res.status(201).json(customer);
    } catch (error) {
        console.error('Error creating customer:', error);
        res.status(400).json({ message: error.message });
    }
};

exports.updateCustomer = async (req, res) => {
    try {
        const customer = await Customer.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        );
        if (!customer) {
            return res.status(404).json({ message: 'Customer not found' });
        }

        // Log action
        logAction('UPDATE_CUSTOMER', `Updated customer: ${customer.name}`, req.user?.id, customer._id, 'Customer', req.ip);

        res.json(customer);
    } catch (error) {
        console.error('Error updating customer:', error);
        res.status(400).json({ message: error.message });
    }
};

exports.deleteCustomer = async (req, res) => {
    try {
        const customer = await Customer.findByIdAndDelete(req.params.id);
        if (!customer) {
            return res.status(404).json({ message: 'Customer not found' });
        }

        // Log action
        logAction('DELETE_CUSTOMER', `Deleted customer: ${customer.name}`, req.user?.id, req.params.id, 'Customer', req.ip);

        res.json({ message: 'Customer deleted successfully' });
    } catch (error) {
        console.error('Error deleting customer:', error);
        res.status(500).json({ message: error.message });
    }
};

exports.searchCustomers = async (req, res) => {
    try {
        const { query } = req.query;
        const customers = await Customer.find({
            $or: [
                { name: { $regex: query, $options: 'i' } },
                { phone: { $regex: query, $options: 'i' } }
            ]
        }).limit(10);
        res.json(customers);
    } catch (error) {
        console.error('Error searching customers:', error);
        res.status(500).json({ message: error.message });
    }
};
