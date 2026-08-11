const express = require('express');
const router = express.Router();
const { registerUser, loginUser, getMe, updateProfile, registerAdmin } = require('../controllers/authController');
const { protect, admin } = require('../middleware/authMiddleware');

router.post('/register', registerUser);
router.post('/login', loginUser);
router.get('/me', protect, getMe);
router.put('/profile', protect, updateProfile);
router.post('/register-admin', protect, admin, registerAdmin);

module.exports = router;