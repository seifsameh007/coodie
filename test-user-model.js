require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

const testUserRegistration = async () => {
    try {
        console.log('Connecting to DB...');
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected.');

        const testEmail = `test_${Date.now()}@example.com`;
        const testUser = new User({
            username: 'TestUser',
            email: testEmail,
            password: 'password123'
        });

        console.log('Attempting to save user...');
        await testUser.save();
        console.log('✅ User saved successfully!');
        console.log('User:', testUser);

        // Clean up
        await User.deleteOne({ email: testEmail });
        console.log('Test user cleaned up.');

        process.exit(0);
    } catch (error) {
        console.error('❌ Error saving user:', error);
        process.exit(1);
    }
};

testUserRegistration();
