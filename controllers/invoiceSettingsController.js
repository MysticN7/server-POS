const InvoiceSettings = require('../models/InvoiceSettings');

exports.getSettings = async (req, res) => {
    try {
        let settings = await InvoiceSettings.findOne();
        if (!settings) {
            // Create default settings if none exist
            settings = new InvoiceSettings({
                shopName: 'Minar Optics',
                invoicePrefix: 'INV'
            });
            await settings.save();
        }
        res.json(settings);
    } catch (error) {
        console.error('Error fetching settings:', error);
        res.status(500).json({ message: error.message });
    }
};

exports.updateSettings = async (req, res) => {
    try {
        let settings = await InvoiceSettings.findOne();
        if (!settings) {
            settings = new InvoiceSettings(req.body);
        } else {
            Object.assign(settings, req.body);
        }
        await settings.save();
        res.json(settings);
    } catch (error) {
        console.error('Error updating settings:', error);
        res.status(400).json({ message: error.message });
    }
};
