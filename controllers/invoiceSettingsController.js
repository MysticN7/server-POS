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
                rx_font_size: 15,
                show_note: true,
                show_signature: false,
                accent_color: '#1f2937',
                theme: 'modern',
                show_icons: true,
                logo_url: '',
                show_logo: false,
                show_rx_table: true,
                paper_width_mm: 80,
                paper_margin_mm: 4,
                compact_mode: true,
                logo_position: 'center',
                logo_size_px: 24,
                grid_thickness_px: 2,
                farewell_text: 'Come Again'
            });
        }

        // Convert to plain object and apply defaults for any missing fields
        const result = settings.toObject();
        if (result.rx_font_size === undefined || result.rx_font_size === null) {
            result.rx_font_size = 15;
        }
        if (!result.currency_symbol) {
            result.currency_symbol = '৳';
        }

        res.json(result);
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
                'tax_rate',
                'accent_color',
                'theme',
                'show_icons',
                'logo_url',
                'show_logo',
                'show_rx_table',
                'paper_width_mm',
                'paper_margin_mm',
                'compact_mode',
                'logo_position',
                'logo_size_px',
                'grid_thickness_px',
                'farewell_text',
                'rx_font_size',
                'currency_symbol',
                'text_styles'
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

// Logo upload using Cloudinary
const multer = require('multer');
const { uploadImage } = require('../utils/cloudinary');
const upload = multer({ storage: multer.memoryStorage() });

exports.uploadLogoHandler = [upload.single('logo'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'Logo file is required' });
        }

        let settings = await InvoiceSettings.findOne();
        if (!settings) {
            settings = await InvoiceSettings.create({});
        }

        const result = await uploadImage(req.file.buffer, 'pos-brand');
        settings.logo_url = result.url;
        settings.logo_cloudinary_id = result.publicId;
        await settings.save();

        res.json(settings.toObject());
    } catch (error) {
        console.error('Error uploading logo:', error);
        res.status(500).json({ message: error.message });
    }
}];
