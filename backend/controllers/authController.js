const User = require('../models/User');
const generateToken = require('../utils/generateToken');

// @route  POST /api/auth/register
// @access Public
const registerUser = async (req, res) => {
    try {
        const { name, email, password } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({ message: 'Name, email, and password are all required' });
        }

        const existingUser = await User.findOne({ email: email.toLowerCase() });
        if (existingUser) {
            return res.status(409).json({ message: 'An account with this email already exists' });
        }

        // password gets hashed automatically by the pre('save') hook on User model
        const user = await User.create({ name, email, password });

        return res.status(201).json({
            _id: user._id,
            name: user.name,
            email: user.email,
            token: generateToken(user._id),
        });
    } catch (err) {
        return res.status(500).json({ message: 'Registration failed', error: err.message });
    }
};

// @route  POST /api/auth/login
// @access Public
const loginUser = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ message: 'Email and password are required' });
        }

        // password field has select:false on the schema, so explicitly include it here
        const user = await User.findOne({ email: email.toLowerCase() }).select('+password');

        if (!user || !(await user.comparePassword(password))) {
            return res.status(401).json({ message: 'Invalid email or password' });
        }

        return res.status(200).json({
            _id: user._id,
            name: user.name,
            email: user.email,
            token: generateToken(user._id),
        });
    } catch (err) {
        return res.status(500).json({ message: 'Login failed', error: err.message });
    }
};

// @route  GET /api/auth/me
// @access Private (requires valid JWT)
const getMe = async (req, res) => {
    // req.user is attached by the `protect` middleware
    return res.status(200).json(req.user);
};

module.exports = { registerUser, loginUser, getMe };