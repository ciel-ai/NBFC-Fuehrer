// src/modules/staff-auth/staffAuth.routes.ts
//
// Staff (web dashboard) authentication routes — mounted at /staff/auth.
//   POST /staff/auth/login         { username, password }      → ADMIN
//   POST /staff/auth/otp/request   { phone, portal }           → CREDIT_* / FINANCE_*
//   POST /staff/auth/otp/verify    { phone, otp, portal }
//   POST /staff/auth/refresh       { refreshToken }
//   POST /staff/auth/logout        (auth)
//   GET  /staff/auth/me            (auth)

import { Router } from 'express';
import { validateBody, staffLoginLimiter } from '@/middlewares';
import { verifyStaffToken } from '@/middlewares/verifyStaffToken.middleware';
import { staffAuthController } from './staffAuth.controller';
import {
    loginSchema,
    otpRequestSchema,
    otpVerifySchema,
    refreshSchema,
} from './staffAuth.validation';

const router = Router();

router.post('/login', staffLoginLimiter, validateBody(loginSchema), staffAuthController.login);
router.post('/otp/request', validateBody(otpRequestSchema), staffAuthController.otpRequest);
router.post('/otp/verify', validateBody(otpVerifySchema), staffAuthController.otpVerify);
router.post('/refresh', validateBody(refreshSchema), staffAuthController.refresh);
router.post('/logout', verifyStaffToken(), staffAuthController.logout);
router.get('/me', verifyStaffToken(), staffAuthController.me);

export { router as staffAuthRouter };
