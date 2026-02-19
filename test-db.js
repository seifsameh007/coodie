require('dotenv').config();
const mongoose = require('mongoose');

const connectDB = async () => {
    console.log('Attempting to connect with URI:', process.env.MONGO_URI.replace(/:([^:@]+)@/, ':****@')); // Hide password in logs
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ MongoDB Connected Successfully!');
        process.exit(0);
    } catch (error) {
        console.error('❌ MongoDB Connection Error:', error);
        console.error('Error Name:', error.name);
        console.error('Error Message:', error.message);
        if (error.cause) console.error('Error Cause:', error.cause);
        process.exit(1);
    }
};

connectDB();
