const asyncHandler = require('../utils/asyncHandler');
const { staffLogin, changePassword, getStaffProfile } = require('../services/staffService');
const AppError = require('../utils/appError');

// POST /staff/login
const login = asyncHandler(async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) throw new AppError('Username and password are required.', 400);
    const result = await staffLogin(username, password);
    res.status(200).json({ success: true, message: 'Login successful.', data: result });
});

// POST /staff/change-password
const updatePassword = asyncHandler(async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) throw new AppError('Current and new password are required.', 400);
    if (newPassword.length < 8) throw new AppError('New password must be at least 8 characters.', 400);
    const staffId = req.user?.userId;
    if (!staffId) throw new AppError('Unauthorized.', 401);
    const result = await changePassword(staffId, currentPassword, newPassword);
    res.status(200).json({ success: true, message: 'Password changed successfully.', data: result });
});

// GET /staff/me
const getMe = asyncHandler(async (req, res) => {
    const staffId = req.user?.userId;
    if (!staffId) throw new AppError('Unauthorized.', 401);
    const result = await getStaffProfile(staffId);
    res.status(200).json({ success: true, data: result });
});

module.exports = { login, updatePassword, getMe };