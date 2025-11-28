const axios = require('axios');

const API_URL = 'http://localhost:5000/api';
const EMAIL = 'admin@minar.com';
const PASSWORD = '123456';

async function verifyCheckout() {
    try {
        console.log('1. Logging in...');
        const loginRes = await axios.post(`${API_URL}/auth/login`, {
            email: EMAIL,
            password: PASSWORD
        });
        const token = loginRes.data.token;
        console.log('   Login successful. Token received.');

        const config = {
            headers: { Authorization: `Bearer ${token}` }
        };

        console.log('2. Creating Product...');
        const productRes = await axios.post(`${API_URL}/products`, {
            sku: `TEST-${Date.now()}`,
            name: 'Checkout Test Item',
            category_id: 1, // Assuming category 1 exists from seed
            cost_price: 100,
            selling_price: 200,
            stock_quantity: 50,
            min_stock_level: 5,
            is_prescription_required: false
        }, config);
        const product = productRes.data;
        console.log(`   Product created: ${product.name} (ID: ${product.id})`);

        console.log('3. Verifying Initial Stock Log...');
        const logsRes1 = await axios.get(`${API_URL}/stock-logs/${product.id}`, config);
        const initialLog = logsRes1.data.find(l => l.type === 'IN' && l.reason === 'Initial Stock');
        if (initialLog && initialLog.quantity_change === 50) {
            console.log('   SUCCESS: Initial Stock log found.');
        } else {
            console.error('   FAILURE: Initial Stock log missing or incorrect.', logsRes1.data);
        }

        console.log('4. Processing Sale (Checkout)...');
        const saleRes = await axios.post(`${API_URL}/sales`, {
            customer_id: 1, // Assuming customer 1 exists from seed
            items: [{ product_id: product.id, quantity: 5 }],
            discount: 0,
            paid_amount: 1000,
            payment_method: 'Cash'
        }, config);
        console.log('   Sale processed successfully.');

        console.log('5. Verifying Stock Out Log...');
        const logsRes2 = await axios.get(`${API_URL}/stock-logs/${product.id}`, config);
        const saleLog = logsRes2.data.find(l => l.type === 'OUT' && l.reason === 'Sale');
        if (saleLog && saleLog.quantity_change === 5) {
            console.log('   SUCCESS: Sale (Stock Out) log found.');
        } else {
            console.error('   FAILURE: Sale log missing or incorrect.', logsRes2.data);
        }

        console.log('6. Verifying Final Stock...');
        const productRes2 = await axios.get(`${API_URL}/products/${product.id}`, config);
        if (productRes2.data.stock_quantity === 45) {
            console.log('   SUCCESS: Product stock updated correctly to 45.');
        } else {
            console.error(`   FAILURE: Expected stock 45, got ${productRes2.data.stock_quantity}`);
        }

    } catch (error) {
        console.error('Error during verification:', error.message);
        if (error.response) {
            console.error('Response status:', error.response.status);
            console.error('Response data:', error.response.data);
        } else if (error.request) {
            console.error('No response received:', error.request);
        } else {
            console.error('Error config:', error.config);
        }
    }
}

verifyCheckout();
