const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const authMiddleware = require('../middleware/authMiddleware');
const otpRateLimiter = require('../middleware/otpRateLimiter');
const validateRequest = require('../middleware/validateRequest');
const {
  sendOtpValidation,
  verifyOtpValidation,
} = require('../validations/userValidation');

// Public auth endpoints consumed by the mobile app.
router.post('/send-otp', otpRateLimiter, validateRequest(sendOtpValidation), userController.sendOtp);
router.post('/verify-otp', otpRateLimiter, validateRequest(verifyOtpValidation), userController.verifyOtp);
router.post('/refresh', userController.refreshToken);

// Protected endpoints (require a valid Bearer access token).
router.post('/logout', authMiddleware, userController.logout);
router.get('/me', authMiddleware, userController.getProfile);

module.exports = router;
