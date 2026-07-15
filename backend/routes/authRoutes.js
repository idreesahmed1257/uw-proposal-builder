const express = require('express');
const router = express.Router();
const { registerUser, loginUser, getMe, registerAdmin } = require('../controllers/authController');
const { protect, admin } = require('../middleware/authMiddleware');

router.post('/register', registerUser);
router.post('/login', loginUser);
router.get('/me', protect, getMe);
router.post('/register-admin', protect, admin, registerAdmin);

module.exports = router;