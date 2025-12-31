const axios = require('axios');

const API_URL = 'https://server-pos-lp6o.onrender.com/api';
const USER = {
    username: 'admin', // or email if endpoint requires it, looking at seed.js it creates user with both
    email: 'admin@minaroptics.com',
    password: 'admin123'
};

async function testProductionBug() {
    try {
        console.log('1. Attempting Login...');
        const loginRes = await axios.post(`${API_URL}/auth/login`, {
            email: USER.email,
            password: USER.password
        });

        const token = loginRes.data.token;
        console.log('✅ Login Successful! Token received.');

        console.log('2. Attempting to create product (No Image)...');
        // Simulate FormData
        // In node axios, we can send JSON if the endpoint handles it, or use FormData lib.
        // The backend uses multer, so it expects multipart/form-data.

        const FormData = require('form-data');
        const form = new FormData();
        form.append('name', 'Test Prod Bug Item');
        form.append('category', 'ACCESSORIES');
        form.append('stockQuantity', '10');
        form.append('price', '99');
        form.append('description', 'Test product created via debug script');
        // No SKU provided

        // Headers for form data
        const headers = {
            ...form.getHeaders(),
            'x-auth-token': token
        };

        const createRes = await axios.post(`${API_URL}/products`, form, { headers });
        console.log('✅ Product Created Successfully!', createRes.data);

    } catch (error) {
        console.error('❌ Request Failed!');
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Data:', JSON.stringify(error.response.data, null, 2));
        } else {
            console.error('Error:', error.message);
        }
    }
}

testProductionBug();
