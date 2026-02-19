const mongoose = require('mongoose');

const connectDB = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGO_URI);
        console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    } catch (error) {
        console.error(`❌ MongoDB Connection Error: ${error.message}`);
        console.error('Please check your .env file and ensure MONGO_URI is correct.');
        // process.exit(1); // Removed to allow server to start without DB for static files
        console.warn('⚠️ Server running without Database connection. API endpoints will fail.');
    }
};

module.exports = connectDB;
