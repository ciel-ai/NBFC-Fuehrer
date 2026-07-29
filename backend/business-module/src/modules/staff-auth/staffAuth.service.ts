// src/modules/staff-auth/staffAuth.service.ts
//
// Staff (web dashboard) authentication.
//   • ADMIN signs in with username + password.
//   • CREDIT_* / FINANCE_* sign in with phone + OTP on the web portal.
//   • SALES_* are provisioned here but may only sign in on the mobile app —
//     attempting a web OTP login returns 403 SALES_USES_MOBILE_APP.
//
// Tokens: 15-min access JWT (aud 'web' | 'mobile') + 7-day rotating refresh
// token (only its sha256 hash is persisted).

import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { prisma } from '@/config/database';
import { logger } from '@/config/logger';
import { env } from '@/config/env';
import { getRedisClient, RedisKeys, RedisTTL } from '@/config/redis';
import { AppError } from '@/errors';
import {
    STAFF_ROLE_META,
    roleFamily,
    canWebLogin,
    isStaffRole,
    type StaffRole,
    type RoleFamily,
} from '@/constants/staffRoles.constants';
import {
    signAccessToken,
    verifyAccessToken,
    generateRefreshToken,
    hashRefreshToken,
    refreshExpiryDate,
} from './staffAuth.jwt';
import type { Portal, StaffAudience, StaffAuthUser } from './staffAuth.types';

// ─── Error builders (precise codes the webdash maps to messages) ───────────────

const err = {
    invalidCredentials: () => new AppError({ message: 'Invalid username or password', statusCode: 401, errorCode: 'INVALID_CREDENTIALS' }),
    salesUsesMobile:    (name: string) => new AppError({ message: `${name} is a Sales user — the Sales team signs in on the FUEHRER mobile app, not the web dashboard.`, statusCode: 403, errorCode: 'SALES_USES_MOBILE_APP' }),
    userDeactivated:    () => new AppError({ message: 'This account has been deactivated. Contact the administrator.', statusCode: 403, errorCode: 'USER_DEACTIVATED' }),
    wrongPortal:        (label: string) => new AppError({ message: `This number is registered as ${label} — switch to the correct portal tab.`, statusCode: 403, errorCode: 'WRONG_PORTAL' }),
    staffNotFound:      (portal: string) => new AppError({ message: `No active ${portal} user is registered with this mobile number`, statusCode: 404, errorCode: 'STAFF_NOT_FOUND' }),
    otpExpired:         () => new AppError({ message: 'OTP expired or not requested. Please request a new OTP.', statusCode: 400, errorCode: 'OTP_EXPIRED' }),
    otpInvalid:         () => new AppError({ message: 'Incorrect OTP — please retry', statusCode: 400, errorCode: 'OTP_INVALID' }),
    otpThrottled:       () => new AppError({ message: 'Too many OTP requests. Please try again later.', statusCode: 429, errorCode: 'OTP_THROTTLED' }),
    otpAttempts:        () => new AppError({ message: 'Too many incorrect attempts. Request a new OTP.', statusCode: 429, errorCode: 'OTP_ATTEMPTS_EXCEEDED' }),
    refreshInvalid:     () => new AppError({ message: 'Session expired. Please sign in again.', statusCode: 401, errorCode: 'REFRESH_INVALID' }),
};

// ─── Presented staff (shape the webdash session store expects) ─────────────────

interface PresentedStaff {
    id: string;
    name: string;
    role: StaffRole;
    email: string;
    phone: string;
    branch: string | null;
    username: string | null;
}

interface AuthResult {
    user: PresentedStaff;
    accessToken: string;
    refreshToken: string;
    expiresIn: number; // seconds
}

type AdminUserRow = Awaited<ReturnType<typeof findByPhone>>;

// ─── Helpers ────────────────────────────────────────────────────────────────

function audForRole(role: StaffRole): StaffAudience {
    return roleFamily(role) === 'SALES' ? 'mobile' : 'web';
}

function present(u: NonNullable<AdminUserRow>): PresentedStaff {
    return {
        id: u.id,
        name: u.full_name,
        role: u.role as StaffRole,
        email: u.email,
        phone: u.phone,
        branch: u.branch?.name ?? null,
        username: u.username,
    };
}

function findByPhone(phone: string) {
    return prisma.admin_users.findFirst({ where: { phone }, include: { branch: true } });
}

async function issueTokens(u: NonNullable<AdminUserRow>, req?: { ip?: string; userAgent?: string }): Promise<AuthResult> {
    const role = u.role as StaffRole;
    const aud = audForRole(role);

    const { token: accessToken } = signAccessToken({
        staffId: u.id,
        role,
        branchId: u.branch_id,
        name: u.full_name,
        aud,
    });

    const { raw: refreshToken, hash } = generateRefreshToken();
    await prisma.admin_refresh_tokens.create({
        data: {
            admin_user_id: u.id,
            token_hash: hash,
            expires_at: refreshExpiryDate(),
            ip: req?.ip ?? null,
            user_agent: req?.userAgent ?? null,
        },
    });

    await prisma.admin_users.update({
        where: { id: u.id },
        data: { last_login_at: new Date() },
    });

    return { user: present(u), accessToken, refreshToken, expiresIn: 15 * 60 };
}

// ─── 1. Admin username + password login ────────────────────────────────────────

export async function login(
    username: string,
    password: string,
    req?: { ip?: string; userAgent?: string },
): Promise<AuthResult> {
    // Admins may sign in by username or email (panel-created admins use email).
    const u = await prisma.admin_users.findFirst({
        where: { OR: [{ username }, { email: username }] },
        include: { branch: true },
    });

    // Generic message — never reveal whether the username exists
    if (!u || !u.password_hash) throw err.invalidCredentials();
    if (u.status !== 'ACTIVE') throw err.userDeactivated();
    if (u.role !== 'ADMIN') throw err.invalidCredentials(); // only ADMIN uses password login

    const matches = await bcrypt.compare(password, u.password_hash);
    if (!matches) throw err.invalidCredentials();

    logger.info({ message: 'Staff admin login', adminId: u.id });
    return issueTokens(u, req);
}

// ─── 2. OTP request (CREDIT / FINANCE / SALES portals) ─────────────────────────

export async function requestOtp(
    phone: string,
    portal: Portal,
): Promise<{ phone: string; devOtp?: string }> {
    const redis = getRedisClient();

    // Throttle: max 3 sends/hour/phone
    // TEMPORARY, DEMO-ONLY: raised limit for a live client demo to avoid
    // interruptions from repeated login attempts. Revert to 3 after the demo.
    const sendsKey = RedisKeys.staffOtpSends(phone);
    const sends = await redis.incr(sendsKey);
    if (sends === 1) await redis.expire(sendsKey, RedisTTL.STAFF_OTP_SEND_WINDOW);
    if (sends > 50) throw err.otpThrottled();

    const u = await findByPhone(phone);
    if (!u) throw err.staffNotFound(portal);

    const family = roleFamily(u.role as StaffRole);
    if (u.status !== 'ACTIVE') throw err.userDeactivated();

    // A Sales user attempting the web Credit/Finance portal
    if (family === 'SALES' && portal !== 'SALES') throw err.salesUsesMobile(u.full_name);
    // Any other portal/role-family mismatch
    if (family !== portal) throw err.wrongPortal(STAFF_ROLE_META[u.role as StaffRole].label);

    // Generate + store hashed OTP, reset the attempt counter
    // TEMPORARY, DEMO-ONLY: fixed OTP instead of random, for a smoother
    // live client demo. Already gated behind !env.isProd below (same as
    // the existing devOtp behavior) - never active in production. Revert
    // to crypto.randomInt(100000, 1000000) after the demo.
    const otp = env.isProd ? crypto.randomInt(100000, 1000000).toString() : '123456';
    const otpHash = await bcrypt.hash(otp, 8);
    await redis.set(RedisKeys.staffOtp(phone), otpHash, 'EX', RedisTTL.STAFF_OTP);
    await redis.del(RedisKeys.staffOtpAttempts(phone));

    // TODO(prod): dispatch via the SMS provider. In non-prod we log + return it.
    logger.info({ message: 'Staff OTP issued', phone, portal });
    if (!env.isProd) {
        logger.info(`\n🔑 STAFF OTP for ${phone}: ${otp}\n`);
        return { phone, devOtp: otp };
    }
    return { phone };
}

// ─── 3. OTP verify ─────────────────────────────────────────────────────────────

export async function verifyOtp(
    phone: string,
    otp: string,
    portal: Portal,
    req?: { ip?: string; userAgent?: string },
): Promise<AuthResult> {
    const redis = getRedisClient();

    const storedHash = await redis.get(RedisKeys.staffOtp(phone));
    if (!storedHash) throw err.otpExpired();

    // Max 3 verify attempts per issued OTP
    const attempts = await redis.incr(RedisKeys.staffOtpAttempts(phone));
    if (attempts > 3) {
        await redis.del(RedisKeys.staffOtp(phone));
        throw err.otpAttempts();
    }

    const matches = await bcrypt.compare(otp, storedHash);
    if (!matches) throw err.otpInvalid();

    // Consume the OTP
    await redis.del(RedisKeys.staffOtp(phone));
    await redis.del(RedisKeys.staffOtpAttempts(phone));

    // Re-resolve the user (must still be active + correct portal)
    const u = await findByPhone(phone);
    if (!u) throw err.staffNotFound(portal);
    if (u.status !== 'ACTIVE') throw err.userDeactivated();

    const family = roleFamily(u.role as StaffRole);
    if (family === 'SALES' && portal !== 'SALES') throw err.salesUsesMobile(u.full_name);
    if (family !== portal) throw err.wrongPortal(STAFF_ROLE_META[u.role as StaffRole].label);

    logger.info({ message: 'Staff OTP login', adminId: u.id, portal });
    return issueTokens(u, req);
}

// ─── 4. Refresh (rotating) ──────────────────────────────────────────────────────

export async function refresh(
    rawToken: string,
    req?: { ip?: string; userAgent?: string },
): Promise<AuthResult> {
    const hash = hashRefreshToken(rawToken);
    const row = await prisma.admin_refresh_tokens.findFirst({
        where: { token_hash: hash, revoked_at: null, expires_at: { gt: new Date() } },
        include: { admin_user: { include: { branch: true } } },
    });
    if (!row) throw err.refreshInvalid();
    if (row.admin_user.status !== 'ACTIVE') throw err.userDeactivated();

    // Rotate: revoke the presented token, issue a fresh pair
    await prisma.admin_refresh_tokens.update({
        where: { id: row.id },
        data: { revoked_at: new Date() },
    });

    return issueTokens(row.admin_user, req);
}

// ─── 5. Change password ─────────────────────────────────────────────────────────

export async function changePassword(
    staffId: string,
    currentPassword: string,
    newPassword: string,
): Promise<void> {
    const u = await prisma.admin_users.findUnique({ where: { id: staffId } });
    if (!u || u.status !== 'ACTIVE') throw err.userDeactivated();
    if (!u.password_hash) throw err.invalidCredentials();

    const matches = await bcrypt.compare(currentPassword, u.password_hash);
    if (!matches) throw err.invalidCredentials();

    const newHash = await bcrypt.hash(newPassword, 10);
    await prisma.admin_users.update({
        where: { id: staffId },
        data: { password_hash: newHash, must_change_password: false },
    });

    logger.info({ message: 'Staff password changed', staffId });
}

// ─── 6. Logout ──────────────────────────────────────────────────────────────────

export async function logout(staff: StaffAuthUser): Promise<void> {
    const redis = getRedisClient();

    // Denylist the access token until its natural expiry
    const ttl = Math.max(1, staff.exp - Math.floor(Date.now() / 1000));
    await redis.set(RedisKeys.staffTokenDenylist(staff.jti), '1', 'EX', ttl);

    // Revoke all outstanding refresh tokens for this staff member
    await prisma.admin_refresh_tokens.updateMany({
        where: { admin_user_id: staff.id, revoked_at: null },
        data: { revoked_at: new Date() },
    });

    logger.info({ message: 'Staff logout', adminId: staff.id });
}

// ─── 7. Current user ──────────────────────────────────────────────────────────────

export async function me(staff: StaffAuthUser): Promise<PresentedStaff> {
    const u = await prisma.admin_users.findUnique({ where: { id: staff.id }, include: { branch: true } });
    if (!u) throw err.refreshInvalid();
    return present(u);
}

// Re-export for the verify middleware
export { verifyAccessToken, isStaffRole };
export type { RoleFamily };
