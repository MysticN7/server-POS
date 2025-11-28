const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');

async function testInvalidFile() {
    try {
        // First login to get token
        const loginRes = await axios.post('http://localhost:5000/api/auth/login', {
            email: 'admin@minaroptics.com',
            password: 'admin123'
        });
        const token = loginRes.data.token;
        console.log('Got token:', token);

        // Create a dummy TEXT file (not an image)
        fs.writeFileSync('test.txt', 'this is a text file');

        // Prepare form data
        const form = new FormData();
        form.append('name', 'Invalid File Product');
        form.append('price', '150');
        form.append('image', fs.createReadStream('test.txt'));

        // Send PUT request
        console.log('Sending request with text file...');
        const res = await axios.put('http://localhost:5000/api/products/1', form, {
            headers: {
                ...form.getHeaders(),
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
        if (fs.existsSync('test.txt')) {
            fs.unlinkSync('test.txt');
        }
    }
}

testInvalidFile();
