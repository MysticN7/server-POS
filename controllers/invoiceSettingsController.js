const InvoiceSettings = require('../models/InvoiceSettings');

exports.getSettings = async (req, res) => {
    try {
        let settings = await InvoiceSettings.findOne();

        if (!settings) {
            settings = await InvoiceSettings.create({
                business_name: 'Minar Optics',
                address: 'Dhaka, Bangladesh',
                phone: '+880 1234 567890',
                email: 'info@minaroptics.com',
                website: '',
                map_link: '',
                footer_text: 'Thank you for your business!',
                show_served_by: true,
                show_date_time: true,
                header_font_size: 12,
                body_font_size: 10,
                show_note: true,
                show_signature: false
            });
        }

        res.json(settings.toObject());
    } catch (error) {
        console.error('Error fetching settings:', error);
        res.status(500).json({ message: error.message });
    }
};

exports.updateSettings = async (req, res) => {
    try {
        let settings = await InvoiceSettings.findOne();
        if (!settings) {
            settings = await InvoiceSettings.create(req.body);
        } else {
            const updatableFields = [
                'business_name',
                'address',
                'phone',
                'email',
                'website',
                'map_link',
                'footer_text',
                'show_served_by',
                'show_date_time',
                'header_font_size',
                'body_font_size',
                'show_note',
                'show_signature',
                'invoice_prefix',
                'tax_rate'
            ];

            updatableFields.forEach((field) => {
                if (Object.prototype.hasOwnProperty.call(req.body, field)) {
                    settings[field] = req.body[field];
                }
            });

            await settings.save();
        }

        res.json(settings.toObject());
    } catch (error) {
        console.error('Error updating settings:', error);
        res.status(400).json({ message: error.message });
    }
};
