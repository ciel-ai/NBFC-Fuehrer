// src/modules/staff-auth/staffAuth.validation.ts
import Joi from 'joi';

// 10-digit Indian mobile (the webdash form sends exactly this)
const phone10 = Joi.string()
    .pattern(/^[6-9]\d{9}$/)
    .message('Enter a valid 10-digit Indian mobile number');

const portal = Joi.string().valid('CREDIT', 'FINANCE', 'SALES');

export const loginSchema = Joi.object({
    username: Joi.string().trim().min(3).max(50).required(),
    password: Joi.string().min(6).max(200).required(),
});

export const otpRequestSchema = Joi.object({
    phone: phone10.required(),
    portal: portal.required(),
});

export const otpVerifySchema = Joi.object({
    phone: phone10.required(),
    otp: Joi.string().pattern(/^\d{6}$/).message('OTP must be 6 digits').required(),
    portal: portal.required(),
});

export const refreshSchema = Joi.object({
    refreshToken: Joi.string().required(),
});

export const changePasswordSchema = Joi.object({
    currentPassword: Joi.string().min(6).max(200).required(),
    newPassword: Joi.string().min(8).max(200).required(),
});
