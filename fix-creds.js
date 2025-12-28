const mongoose = require('mongoose');
const User = require('./models/User');
require('dotenv').config();

async function fixData() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        // Reset admin exactly as in seed.js
        const admin = await User.findOne({ username: 'admin' });
        if (admin) {
            admin.email = 'admin@minaroptics.com';
            admin.password = 'admin123';
            admin.role = 'ADMIN';
            await admin.save();
            console.log('✅ Admin synced with seed.js (email: admin@minaroptics.com, password: admin123)');
        } else {
            console.log('⚠️ Admin user not found by username "admin"');
        }

        // Fix staff exactly as in seed.js
        const staff = await User.findOne({ username: 'staff' });
        if (staff) {
            staff.email = 'staff@minaroptics.com';
            staff.password = 'staff123';
            staff.role = 'SALESPERSON'; // Seed says SALESPERSON
            await staff.save();
            console.log('✅ Staff synced with seed.js (email: staff@minaroptics.com, password: staff123, role: SALESPERSON)');
        } else {
            console.log('⚠️ Staff user not found by username "staff"');
        }

        process.exit(0);
    } catch (error) {
        console.error('❌ Error fixing data:', error);
        process.exit(1);
    }
}

fixData();
