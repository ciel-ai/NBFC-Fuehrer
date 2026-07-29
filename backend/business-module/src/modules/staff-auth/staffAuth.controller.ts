// src/modules/staff-auth/staffAuth.controller.ts
import type { Request, Response, NextFunction } from 'express';
import { successResponse } from '@/utils/apiResponse.util';
import { getValidatedBody } from '@/types/express';
import { getStaffUser } from '@/middlewares/verifyStaffToken.middleware';
import * as service from './staffAuth.service';
import type { Portal } from './staffAuth.types';

function reqCtx(req: Request): { ip?: string; userAgent?: string } {
    return { ip: req.ip, userAgent: req.headers['user-agent'] };
}

export const staffAuthController = {
    async login(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { username, password } = getValidatedBody<{ username: string; password: string }>(req);
            const result = await service.login(username, password, reqCtx(req));
            res.status(200).json(successResponse(result, 'Signed in'));
        } catch (err) { next(err); }
    },

    async otpRequest(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { phone, portal } = getValidatedBody<{ phone: string; portal: Portal }>(req);
            const result = await service.requestOtp(phone, portal);
            res.status(200).json(successResponse(result, 'OTP sent'));
        } catch (err) { next(err); }
    },

    async otpVerify(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { phone, otp, portal } = getValidatedBody<{ phone: string; otp: string; portal: Portal }>(req);
            const result = await service.verifyOtp(phone, otp, portal, reqCtx(req));
            res.status(200).json(successResponse(result, 'Signed in'));
        } catch (err) { next(err); }
    },

    async refresh(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { refreshToken } = getValidatedBody<{ refreshToken: string }>(req);
            const result = await service.refresh(refreshToken, reqCtx(req));
            res.status(200).json(successResponse(result, 'Token refreshed'));
        } catch (err) { next(err); }
    },

    async logout(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            await service.logout(getStaffUser(req));
            res.status(200).json(successResponse({ success: true }, 'Signed out'));
        } catch (err) { next(err); }
    },

    async me(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const user = await service.me(getStaffUser(req));
            res.status(200).json(successResponse(user));
        } catch (err) { next(err); }
    },

    async changePassword(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { currentPassword, newPassword } = getValidatedBody<{ currentPassword: string; newPassword: string }>(req);
            await service.changePassword(getStaffUser(req).id, currentPassword, newPassword);
            res.status(200).json(successResponse({ success: true }, 'Password changed'));
        } catch (err) { next(err); }
    },
};
