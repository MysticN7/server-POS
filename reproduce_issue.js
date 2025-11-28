const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');

async function testUpdate() {
    try {
        // First login to get token
        const loginRes = await axios.post('http://localhost:5000/api/auth/login', {
            email: 'admin@minaroptics.com',
            password: 'admin123'
        });
        const token = loginRes.data.token;
        console.log('Got token:', token);

        // Create a dummy file
        fs.writeFileSync('test-image.jpg', 'fake image content');

        // Prepare form data
        const form = new FormData();
        form.append('name', 'Updated Product Name');
        form.append('price', '150');
        form.append('image', fs.createReadStream('test-image.jpg'));

        // Send PUT request
        const res = await axios.put('http://localhost:5000/api/products/1', form, {
            headers: {
                ...form.getHeaders(),
                'x-auth-token': token
            }
        });

        console.log('Update success:', res.data);

    } catch (error) {
        if (error.response) {
            console.error('Update failed:', error.response.status);
            console.error('Data:', error.response.data);
        } else {
            console.error('Error:', error.message);
        }
    } finally {
        if (fs.existsSync('test-image.jpg')) {
            fs.unlinkSync('test-image.jpg');
        }
    }
}

testUpdate();
