// ════════════════════════════════════════════
// routes/authRoutes.js
// ════════════════════════════════════════════
const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { protect } = require('../middleware/auth');

router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/logout', protect, authController.logout);
router.post('/refresh-token', authController.refreshToken);
router.get('/me', protect, authController.getMe);
router.post('/forgot-password', authController.forgotPassword);
router.put('/reset-password/:token', authController.resetPassword);
router.put('/change-password', protect, authController.changePassword);
router.get('/verify-email/:token', authController.verifyEmail);

module.exports = router;
