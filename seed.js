const mongoose = require('mongoose');
const User = require('./models/User');
const Category = require('./models/Category');
const Product = require('./models/Product');
const Customer = require('./models/Customer');
const InvoiceSettings = require('./models/InvoiceSettings');
require('dotenv').config();

const PERMISSIONS_LIST = ['DASHBOARD', 'POS', 'INVENTORY', 'EXPENSES', 'REPORTS', 'JOBCARDS', 'SETTINGS', 'USERS'];

async function seed() {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        // Clear existing data (optional - comment out if you want to keep existing data)
        await User.deleteMany({});
        await Category.deleteMany({});
        await Product.deleteMany({});
        await Customer.deleteMany({});
        await InvoiceSettings.deleteMany({});
        console.log('🗑️  Cleared existing data');

        // Create Categories
        const categories = [
            { name: 'Frames' },
            { name: 'Lenses' },
            { name: 'Accessories' }
        ];

        await Category.insertMany(categories);
        console.log('✅ Created categories');

        // Create Products
        const products = [
            { sku: 'FR001', name: 'Metal Frame Gold', category: 'FRAMES', price: 800, stockQuantity: 50, description: 'High quality metal frame' },
            { sku: 'FR002', name: 'Plastic Frame Black', category: 'FRAMES', price: 500, stockQuantity: 75, description: 'Durable plastic frame' },
            { sku: 'FR003', name: 'Designer Frame Red', category: 'FRAMES', price: 1500, stockQuantity: 30, description: 'Designer red frame' },
            { sku: 'FR004', name: 'Aviator Frame Silver', category: 'FRAMES', price: 1200, stockQuantity: 40, description: 'Classic aviator style' },
            { sku: 'FR005', name: 'Round Frame Tortoise', category: 'FRAMES', price: 900, stockQuantity: 35, description: 'Vintage round frame' },
            { sku: 'LN001', name: 'Single Vision Lens', category: 'LENS', price: 400, stockQuantity: 100, description: 'Standard single vision lens' },
            { sku: 'LN002', name: 'Progressive Lens', category: 'LENS', price: 1200, stockQuantity: 60, description: 'Advanced progressive lens' },
            { sku: 'LN003', name: 'Blue Light Blocking Lens', category: 'LENS', price: 600, stockQuantity: 80, description: 'Protects eyes from blue light' },
            { sku: 'LN004', name: 'Photochromic Lens', category: 'LENS', price: 1000, stockQuantity: 45, description: 'Transitions in sunlight' },
            { sku: 'LN005', name: 'Polarized Lens', category: 'LENS', price: 800, stockQuantity: 55, description: 'Reduces glare' },
            { sku: 'AC001', name: 'Lens Cleaning Kit', category: 'ACCESSORIES', price: 100, stockQuantity: 200, description: 'Complete cleaning kit' },
            { sku: 'AC002', name: 'Eyeglass Case Hard', category: 'ACCESSORIES', price: 200, stockQuantity: 150, description: 'Hard shell case' },
            { sku: 'AC003', name: 'Anti-Fog Spray', category: 'ACCESSORIES', price: 150, stockQuantity: 120, description: 'Prevents fogging' },
            { sku: 'AC004', name: 'Eyeglass Chain', category: 'ACCESSORIES', price: 180, stockQuantity: 90, description: 'Stylish eyeglass chain' },
            { sku: 'AC005', name: 'Microfiber Cloth', category: 'ACCESSORIES', price: 50, stockQuantity: 300, description: 'Soft cleaning cloth' },
        ];

        await Product.insertMany(products);
        console.log('✅ Created 15 products');

        // Create Customers
        const customers = [
            { name: 'John Doe', phone: '01711111111', email: 'john@example.com', address: '123 Main St, Dhaka' },
            { name: 'Jane Smith', phone: '01722222222', email: 'jane@example.com', address: '456 Park Ave, Dhaka' },
            { name: 'Ahmed Hassan', phone: '01733333333', email: 'ahmed@example.com', address: '789 Lake Rd, Chittagong' },
            { name: 'Fatima Khan', phone: '01744444444', email: 'fatima@example.com', address: '321 Hill St, Sylhet' },
            { name: 'Mohammad Ali', phone: '01755555555', email: 'mohammad@example.com', address: '654 Beach Rd, Cox\'s Bazar' },
            { name: 'Sarah Rahman', phone: '01766666666', email: 'sarah@example.com', address: '987 Green Ave, Dhaka' },
            { name: 'Karim Uddin', phone: '01777777777', email: 'karim@example.com', address: '147 River Rd, Khulna' },
            { name: 'Nadia Islam', phone: '01788888888', email: 'nadia@example.com', address: '258 Garden St, Rajshahi' },
            { name: 'Rahim Mia', phone: '01799999999', email: 'rahim@example.com', address: '369 Market Rd, Barisal' },
            { name: 'Walk-in Customer', phone: '0000000000', address: 'N/A' },
        ];

        await Customer.insertMany(customers);
        console.log('✅ Created 10 customers');

        // Create default admin user
        const admin = new User({
            name: 'Admin User',
            username: 'admin',
            email: 'admin@minaroptics.com',
            password: 'admin123', // Will be hashed by pre-save hook
            role: 'ADMIN',
            permissions: PERMISSIONS_LIST
        });
        await admin.save();
        console.log('✅ Created admin user');

        // Create staff user
        const staff = new User({
            name: 'Sales Staff',
            username: 'staff',
            email: 'staff@minaroptics.com',
            password: 'staff123',
            role: 'SALESPERSON',
            permissions: ['POS', 'INVENTORY', 'REPORTS']
        });
        await staff.save();
        console.log('✅ Created staff user');

        // Create default Invoice Settings
        const settings = new InvoiceSettings({
            business_name: 'Minar Optics',
            address: 'Dhaka, Bangladesh',
            phone: '+880 1234 567890',
            email: 'info@minaroptics.com',
            footer_text: 'Thank you for your business! Come Again 👓',
            show_served_by: true,
            show_date_time: true,
            show_note: true,
            invoice_prefix: 'INV'
        });
        await settings.save();
        console.log('✅ Created invoice settings');

        console.log('\n🎉 Seed completed successfully!');
        console.log('═══════════════════════════════════════');
        console.log('📦 Products: 15 items');
        console.log('👥 Customers: 10 customers');
        console.log('👤 Users: 2 users (admin + staff)');
        console.log('⚙️  Invoice settings configured');
        console.log('═══════════════════════════════════════');
        console.log('\n🔐 Login Credentials:');
        console.log('   Admin:');
        console.log('   � Email: admin@minaroptics.com');
        console.log('   � Password: admin123');
        console.log('\n   Staff:');
        console.log('   📧 Email: staff@minaroptics.com');
        console.log('   🔑 Password: staff123');
        console.log('═══════════════════════════════════════\n');

        process.exit(0);
    } catch (error) {
        console.error('❌ Seed failed:', error);
        process.exit(1);
    }
}

seed();
