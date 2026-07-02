// src/modules/staff-auth/staffAuth.jwt.ts
//
// JWT + refresh-token helpers for staff (web dashboard) auth.
// Access tokens are short-lived (15 min) and carry an `aud` claim so a web
// token can never be replayed on the mobile surface (and vice-versa).
// Refresh tokens are opaque random strings — only their SHA-256 hash is stored.

import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { env } from '@/config/env';
import type { StaffRole } from '@/constants/staffRoles.constants';
import type { StaffAudience, StaffAuthUser } from './staffAuth.types';
import { AUTH_ERRORS } from '@/errors';

const ACCESS_TTL = '15m';
export const REFRESH_TTL_DAYS = 7;

interface SignArgs {
    staffId: string;
    role: StaffRole;
    branchId: string | null;
    name: string;
    aud: StaffAudience;
}

// ─── Access token ──────────────────────────────────────────────────────────

export function signAccessToken(args: SignArgs): { token: string; jti: string } {
    const jti = crypto.randomUUID();
    const token = jwt.sign(
        { role: args.role, branchId: args.branchId, name: args.name },
        env.auth.jwtSecret,
        {
            algorithm: 'HS256',
            expiresIn: ACCESS_TTL,
            audience: args.aud,
            subject: args.staffId,
            jwtid: jti,
        },
    );
    return { token, jti };
}

/**
 * Verify a staff access token for a specific audience.
 * Throws AUTH_ERRORS.* on any failure (expired, malformed, wrong audience).
 */
export function verifyAccessToken(token: string, audience: StaffAudience): StaffAuthUser {
    try {
        const decoded = jwt.verify(token, env.auth.jwtSecret, {
            algorithms: ['HS256'],
            audience,
        }) as Record<string, unknown>;

        return {
            id: decoded.sub as string,
            role: decoded.role as StaffRole,
            branchId: (decoded.branchId as string | null) ?? null,
            name: decoded.name as string,
            aud: decoded.aud as StaffAudience,
            jti: decoded.jti as string,
            iat: decoded.iat as number,
            exp: decoded.exp as number,
        };
    } catch (err: unknown) {
        if (err instanceof jwt.TokenExpiredError) throw AUTH_ERRORS.expiredToken();
        throw AUTH_ERRORS.invalidToken();
    }
}

// ─── Refresh tokens ───────────────────────────────────────────────────────────
// Opaque 320-bit random string. We persist only sha256(raw); the raw value is
// returned to the client once and never stored.

export function generateRefreshToken(): { raw: string; hash: string } {
    const raw = crypto.randomBytes(40).toString('hex');
    return { raw, hash: hashRefreshToken(raw) };
}

export function hashRefreshToken(raw: string): string {
    return crypto.createHash('sha256').update(raw).digest('hex');
}

export function refreshExpiryDate(): Date {
    return new Date(Date.now() + REFRESH_TTL_DAYS * 24 * 60 * 60 * 1000);
}
