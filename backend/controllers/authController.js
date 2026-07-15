const User = require('../models/User');
const generateToken = require('../utils/generateToken');
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

        // Initial Hardcoded Admin Setup
        // Email: admin@devnauts.com
        const role = email.toLowerCase() === 'admin@devnauts.com' ? 'admin' : 'member';
        
        const user = await User.create({ name, email, password, role });

        return res.status(201).json({
            _id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            token: generateToken(user._id),
        });
    } catch (err) {
        return res.status(500).json({ message: 'Registration failed', error: err.message });
    }
};

const loginUser = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ message: 'Email and password are required' });
        }

        const user = await User.findOne({ email: email.toLowerCase() }).select('+password');

        if (!user || !(await user.comparePassword(password))) {
            return res.status(401).json({ message: 'Invalid email or password' });
        }

        return res.status(200).json({
            _id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            token: generateToken(user._id),
        });
    } catch (err) {
        return res.status(500).json({ message: 'Login failed', error: err.message });
    }
};

const getMe = async (req, res) => {
    return res.status(200).json(req.user);
};

const registerAdmin = async (req, res) => {
    try {
        const { name, email, password } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({ message: 'Name, email, and password are all required' });
        }

        const existingUser = await User.findOne({ email: email.toLowerCase() });
        if (existingUser) {
            return res.status(409).json({ message: 'An account with this email already exists' });
        }

        const user = await User.create({ name, email, password, role: 'admin' });

        return res.status(201).json({
            _id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
        });
    } catch (err) {
        return res.status(500).json({ message: 'Admin registration failed', error: err.message });
    }
};

module.exports = { registerUser, loginUser, getMe, registerAdmin };