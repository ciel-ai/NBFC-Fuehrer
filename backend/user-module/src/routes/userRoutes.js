const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const authMiddleware = require('../middleware/authMiddleware');
const validateRequest = require('../middleware/validateRequest');
const otpRateLimiter = require('../middleware/otpRateLimiter');
const verifyInternalApiKey = require('../middleware/verifyInternalApiKey');
const {
  registerValidation,
  sendOtpValidation,
  verifyOtpValidation,
  loginValidation,
  profileUpdateValidation,
  userIdValidation,
} = require('../validations/userValidation');

router.post('/register', otpRateLimiter, validateRequest(registerValidation), userController.register);
router.post('/send-otp', otpRateLimiter, validateRequest(sendOtpValidation), userController.sendOtp);
router.post('/verify-otp', validateRequest(verifyOtpValidation), userController.verifyOtp);
router.post('/login', otpRateLimiter, validateRequest(loginValidation), userController.login);
router.post('/logout', authMiddleware, userController.logout);
router.get('/profile', authMiddleware, userController.getProfile);
router.put('/profile', authMiddleware, validateRequest(profileUpdateValidation), userController.updateProfile);
router.get('/:userId', authMiddleware, validateRequest(userIdValidation), userController.getUserById);

// Internal-only: called by business-module (staff-authenticated on that
// side) to deactivate/reactivate a customer account. Not exposed to any
// customer-facing client.
router.patch('/internal/:userId/status', verifyInternalApiKey, userController.setUserActiveStatus);

module.exports = router;
