const cloudinary = require('cloudinary').v2;
require('dotenv').config();

// Configure Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

console.log('Testing Cloudinary Configuration...');
console.log('Cloud Name:', process.env.CLOUDINARY_CLOUD_NAME);
console.log('API Key:', process.env.CLOUDINARY_API_KEY);
console.log('API Secret:', process.env.CLOUDINARY_API_SECRET ? '***' + process.env.CLOUDINARY_API_SECRET.slice(-4) : 'NOT SET');

// Test the connection
cloudinary.api.ping()
    .then(result => {
        console.log('✅ Cloudinary connection successful!');
        console.log('Result:', result);
        process.exit(0);
    })
    .catch(error => {
        console.error('❌ Cloudinary connection failed!');
        console.error('Error:', error.message);
        console.error('\n📝 Instructions to fix:');
        console.error('1. Go to https://cloudinary.com/console');
        console.error('2. Look for "Cloud Name" at the top of the dashboard');
        console.error('3. Update CLOUDINARY_CLOUD_NAME in your .env file');
        console.error('4. The cloud name is usually something like "dxxxxx" or your account name');
        process.exit(1);
    });
