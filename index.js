const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const dotenv = require('dotenv');
const connectDB = require('./config/database');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

process.on('exit', (code) => {
    console.log(`About to exit with code: ${code}`);
});

// Middleware
app.use(cors());
// app.use(helmet({
//     crossOriginResourcePolicy: false,
// }));
app.use(morgan('dev'));
app.use(express.json());
app.use('/uploads', (req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    next();
});
app.use('/uploads', express.static('uploads'));

// Routes Placeholder
app.get('/', (req, res) => {
    res.send('Minar Optics POS API is running');
});

// Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/sales', require('./routes/salesRoutes'));
app.use('/api/customers', require('./routes/customerRoutes'));
app.use('/api/expenses', require('./routes/expenseRoutes'));
app.use('/api/reports', require('./routes/reportRoutes'));
app.use('/api/job-cards', require('./routes/jobCardRoutes'));
app.use('/api/categories', require('./routes/categoryRoutes'));
app.use('/api/invoice-settings', require('./routes/invoiceSettingsRoutes'));
app.use('/api/products', require('./routes/productRoutes'));
app.use('/api/users', require('./routes/userRoutes'));
app.use('/api/bank', require('./routes/bankRoutes'));
app.use('/api/cash', require('./routes/cashRoutes'));

// Global Error Handler
app.use((err, req, res, next) => {
    console.error('❌ Global Error Handler:', err);
    if (err.message === 'Only image files (jpeg, jpg, png, webp) are allowed!') {
        return res.status(400).json({ message: err.message });
    }
    if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ message: 'File too large! Max size is 5MB.' });
    }
    res.status(500).json({ message: err.message || 'Internal Server Error' });
});

// Database Connection and Server Start
const startServer = async () => {
    try {
        // Connect to MongoDB
        await connectDB();

        console.log('Attempting to start server...');
        const server = app.listen(PORT, () => {
            console.log(`✅ Server is running on port ${PORT}`);
            console.log(`🔗 API URL: http://localhost:${PORT}`);
        });

        server.on('error', (e) => {
            console.error('❌ Server Error:', e);
        });
    } catch (error) {
        console.error('❌ Failed to start server:', error);
        process.exit(1);
    }
};

startServer();
