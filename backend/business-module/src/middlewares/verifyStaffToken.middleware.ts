// src/middlewares/verifyStaffToken.middleware.ts
//
// Authenticates staff (web dashboard / mobile sales) requests.
// Unlike verifyToken (customer auth, optional), this REQUIRES a valid staff
// token for the given audience and attaches req.staffUser.

import type { Request, Response, NextFunction } from 'express';
import { getRedisClient, RedisKeys } from '@/config/redis';
import { AUTH_ERRORS } from '@/errors';
import { verifyAccessToken } from '@/modules/staff-auth/staffAuth.jwt';
import type { StaffAudience, StaffAuthUser } from '@/modules/staff-auth/staffAuth.types';

function extractToken(req: Request): string | null {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) return null;
    const token = authHeader.slice(7).trim();
    return token.length > 0 ? token : null;
}

export function verifyStaffToken(audience: StaffAudience = 'web') {
    return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
        const token = extractToken(req);
        if (!token) return next(AUTH_ERRORS.missingToken());

        try {
            const staff = verifyAccessToken(token, audience);

            // Logout-before-expiry denylist
            const redis = getRedisClient();
            const denied = await redis
                .get(RedisKeys.staffTokenDenylist(staff.jti))
                .catch(() => null);
            if (denied) throw AUTH_ERRORS.tokenRevoked();

            req.staffUser = staff;
            req.requestLogger = req.requestLogger.child({ staffId: staff.id });
            next();
        } catch (err) {
            next(err);
        }
    };
}

export function getStaffUser(req: Request): StaffAuthUser {
    if (!req.staffUser) {
        throw new Error('getStaffUser called before verifyStaffToken ran — check middleware order');
    }
    return req.staffUser;
}
