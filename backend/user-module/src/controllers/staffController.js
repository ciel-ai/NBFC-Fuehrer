const asyncHandler = require('../utils/asyncHandler');
const { staffLogin, changePassword, getStaffProfile, requestPortalOtp, verifyPortalOtp } = require('../services/staffService');
const AppError = require('../utils/appError');

const login = asyncHandler(async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) throw new AppError('Username and password are required.', 400);
    const result = await staffLogin(username, password);
    res.status(200).json({ success: true, message: 'Login successful.', data: result });
});

const updatePassword = asyncHandler(async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) throw new AppError('Fields required.', 400);
    if (newPassword.length < 8) throw new AppError('Min 8 chars.', 400);
    const result = await changePassword(req.user.userId, currentPassword, newPassword);
    res.status(200).json({ success: true, data: result });
});

const getMe = asyncHandler(async (req, res) => {
    const result = await getStaffProfile(req.user.userId);
    res.status(200).json({ success: true, data: result });
});

const requestOtp = asyncHandler(async (req, res) => {
    const { phone, portal } = req.body;
    if (!phone || !portal) throw new AppError('Phone and portal are required.', 400);
    const result = await requestPortalOtp(phone, portal);
    res.status(200).json({ success: true, message: 'OTP sent.', data: result });
});

const verifyOtp = asyncHandler(async (req, res) => {
    const { phone, otp, portal } = req.body;
    if (!phone || !otp || !portal) throw new AppError('Phone, OTP and portal are required.', 400);
    const result = await verifyPortalOtp(phone, otp, portal);
    res.status(200).json({ success: true, message: 'Login successful.', data: result });
});

module.exports = { login, updatePassword, getMe, requestOtp, verifyOtp };