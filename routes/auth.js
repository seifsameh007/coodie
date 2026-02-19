const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Generate JWT Token
function generateToken(user) {
    return jwt.sign(
        { id: user._id, email: user.email, username: user.username },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
    );
}

// POST /api/auth/register
router.post('/register', async (req, res) => {
    try {
        const { username, email, password } = req.body;

        // Validation
        if (!username || !email || !password) {
            return res.status(400).json({ error: 'All fields are required' });
        }

        if (username.length < 3) {
            return res.status(400).json({ error: 'Username must be at least 3 characters' });
        }

        if (password.length < 6) {
            return res.status(400).json({ error: 'Password must be at least 6 characters' });
        }

        // Email format validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ error: 'Invalid email format' });
        }

        // Check if user exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ error: 'User with this email already exists' });
        }

        // Create user
        const user = new User({ username, email, password });
        await user.save();

        // Generate token
        const token = generateToken(user);

        res.status(201).json({
            message: 'Account created successfully',
            token,
            user: {
                id: user._id,
                username: user.username,
                email: user.email
            }
        });
    } catch (error) {
        console.error('Register error:', error);
        res.status(500).json({ error: 'Server error, please try again later' });
    }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        // Validation
        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }

        // Find user
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ error: 'No account found with this email' });
        }

        // Check if user signed up with Google only
        if (user.googleId && !user.password) {
            return res.status(400).json({ error: 'This account uses Google sign-in. Please use Google to log in.' });
        }

        // Compare password
        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            return res.status(400).json({ error: 'Incorrect password' });
        }

        // Generate token
        const token = generateToken(user);

        res.json({
            message: 'Signed in successfully',
            token,
            user: {
                id: user._id,
                username: user.username,
                email: user.email
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Server error, please try again later' });
    }
});

// POST /api/auth/google
router.post('/google', async (req, res) => {
    try {
        const { credential } = req.body;

        if (!credential) {
            return res.status(400).json({ error: 'Google credential is required' });
        }

        // Verify the Google ID token
        // Using Google's tokeninfo endpoint for verification
        const https = require('https');
        const verifyUrl = `https://oauth2.googleapis.com/tokeninfo?id_token=${credential}`;

        const verifyGoogle = () => new Promise((resolve, reject) => {
            https.get(verifyUrl, (resp) => {
                let data = '';
                resp.on('data', (chunk) => { data += chunk; });
                resp.on('end', () => {
                    try {
                        const parsed = JSON.parse(data);
                        if (parsed.error) reject(new Error(parsed.error_description || 'Invalid token'));
                        else resolve(parsed);
                    } catch (e) { reject(e); }
                });
            }).on('error', reject);
        });

        const googleUser = await verifyGoogle();

        // Check if user exists
        let user = await User.findOne({
            $or: [
                { googleId: googleUser.sub },
                { email: googleUser.email }
            ]
        });

        if (user) {
            // Update Google ID if not set
            if (!user.googleId) {
                user.googleId = googleUser.sub;
                user.avatar = googleUser.picture || user.avatar;
                await user.save();
            }
        } else {
            // Create new user
            user = new User({
                username: googleUser.name || googleUser.email.split('@')[0],
                email: googleUser.email,
                googleId: googleUser.sub,
                avatar: googleUser.picture || null
            });
            await user.save();
        }

        const token = generateToken(user);

        res.json({
            message: 'Signed in successfully with Google',
            token,
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
                avatar: user.avatar
            }
        });
    } catch (error) {
        console.error('Google auth error:', error);
        res.status(500).json({ error: 'Google authentication failed' });
    }
});

// GET /api/auth/me — get current user from token
router.get('/me', require('../middleware/auth'), async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-password');
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        res.json({ user });
    } catch (error) {
        console.error('Get user error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
