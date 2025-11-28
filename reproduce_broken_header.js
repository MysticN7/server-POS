const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');

async function testBrokenUpdate() {
    try {
        // First login to get token
        const loginRes = await axios.post('http://localhost:5000/api/auth/login', {
            email: 'admin@minaroptics.com',
            password: 'admin123'
        });
        const token = loginRes.data.token;
        console.log('Got token:', token);

        // Create a dummy file
        if (!fs.existsSync('test-image.jpg')) {
            fs.writeFileSync('test-image.jpg', 'fake image content');
        }

        // Prepare form data
        const form = new FormData();
        form.append('name', 'Broken Update');
        form.append('price', '150');
        form.append('image', fs.createReadStream('test-image.jpg'));

        // Send PUT request with BROKEN header (simulating the bug)
        console.log('Sending request with manual Content-Type (no boundary)...');
        const res = await axios.put('http://localhost:5000/api/products/1', form, {
            headers: {
                'Content-Type': 'multipart/form-data', // This is the bug!
                'x-auth-token': token
            }
        });

        console.log('Update success (unexpected):', res.data);

    } catch (error) {
        if (error.response) {
            console.log('Update failed as expected!');
            console.log('Status:', error.response.status);
            console.log('Data:', error.response.data);
        } else {
            console.error('Error:', error.message);
        }
    } finally {
        if (fs.existsSync('test-image.jpg')) {
            fs.unlinkSync('test-image.jpg');
        }
    }
}

testBrokenUpdate();
