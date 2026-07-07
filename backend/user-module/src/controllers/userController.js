<<<<<<< HEAD
﻿const userService = require('../services/userService');
=======
const userService = require('../services/userService');
>>>>>>> origin/main
const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/response');

const register = asyncHandler(async (req, res) => {
  const { phone, role } = req.body;
const result = await userService.registerUser(phone, role);

  sendSuccess(res, {
    statusCode: 201,
    message: 'User registered successfully.',
    data: result,
  });
});

const sendOtp = asyncHandler(async (req, res) => {
  const { phone } = req.body;
  const result = await userService.sendOtp(phone);

  sendSuccess(res, {
    message: 'OTP sent successfully.',
    data: result,
  });
});

const verifyOtp = asyncHandler(async (req, res) => {
  const { phone, otp } = req.body;
  const result = await userService.verifyOtp(phone, otp);

  sendSuccess(res, {
    message: 'OTP verified successfully.',
    data: result,
  });
});

const login = asyncHandler(async (req, res) => {
  const { phone } = req.body;
  const result = await userService.loginUser(phone);

  sendSuccess(res, {
    message: 'Login OTP sent successfully.',
    data: result,
  });
});

<<<<<<< HEAD
const refresh = asyncHandler(async (req, res) => {
  const { generateToken } = require('../utils/jwtUtils');
  const newToken = generateToken(req.user.userId, req.user.phone, req.user.role);
  sendSuccess(res, { message: 'Token refreshed.', data: { token: newToken } });
});

const logout = asyncHandler(async (req, res) => {
  const result = await userService.logoutUser(req.user.userId, req.token, req.user.exp);
=======
const refreshToken = asyncHandler(async (req, res) => {
  const result = await userService.refreshTokens(req.body && req.body.refreshToken);

  sendSuccess(res, {
    message: 'Token refreshed successfully.',
    data: result,
  });
});

const logout = asyncHandler(async (req, res) => {
  const bodyRefreshToken = req.body && req.body.refreshToken;
  const result = await userService.logoutUser(
    req.user.userId,
    req.token,
    req.user.exp,
    bodyRefreshToken,
  );
>>>>>>> origin/main

  sendSuccess(res, {
    message: 'Logged out successfully.',
    data: result,
  });
});

const getProfile = asyncHandler(async (req, res) => {
  const result = await userService.getProfile(req.user.userId);

  sendSuccess(res, {
    message: 'User profile fetched successfully.',
    data: result,
  });
});

const updateProfile = asyncHandler(async (req, res) => {
  const result = await userService.updateProfile(req.user.userId, req.body);

  sendSuccess(res, {
    message: 'User profile updated successfully.',
    data: result,
  });
});

const getUserById = asyncHandler(async (req, res) => {
  const result = await userService.getUserById(req.params.userId);

  sendSuccess(res, {
    message: 'User fetched successfully.',
    data: result,
  });
});

module.exports = {
<<<<<<< HEAD
  refresh,
  register,
  sendOtp,
  verifyOtp,
=======
  register,
  sendOtp,
  verifyOtp,
  refreshToken,
>>>>>>> origin/main
  login,
  logout,
  getProfile,
  updateProfile,
  getUserById,
};
<<<<<<< HEAD


=======
>>>>>>> origin/main
