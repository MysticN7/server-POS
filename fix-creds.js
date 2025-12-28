const mongoose = require('mongoose');
const User = require('./models/User');
require('dotenv').config();

async function fixData() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        // Reset admin password to admin123
        const admin = await User.findOne({ username: 'admin' });
        if (admin) {
            admin.password = 'admin123';
            admin.role = 'ADMIN'; // Ensure role is correct
            await admin.save();
            console.log('✅ Admin password reset to admin123');
        } else {
            console.log('⚠️ Admin user not found by username "admin"');
        }

        // Fix staff role and ensure password
        const staff = await User.findOne({ username: 'staff' });
        if (staff) {
            staff.password = 'staff123';
            staff.role = 'STAFF';
            await staff.save();
            console.log('✅ Staff password set to staff123 and role updated to STAFF');
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
