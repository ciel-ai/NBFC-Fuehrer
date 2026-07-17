// src/middlewares/verifyToken.middleware.ts
import jwt from 'jsonwebtoken';
import type { Request, Response, NextFunction } from 'express';
import { env } from '@/config/env';
import { getRedisClient, RedisKeys } from '@/config/redis';
import {
    UnauthorizedError,
    AUTH_ERRORS,
} from '@/errors';
import type { AuthenticatedUser } from '@/types/express';
import { isStaffRole } from '@/constants/staffRoles.constants';
import { createModuleLogger } from '@/config/logger';

const log = createModuleLogger('verifyToken');

// ─── Token extraction ──────────────────────────────────────────────────────────
// Accept: "Bearer <token>" in Authorization header only.
// We do not read tokens from cookies or query strings — security best practice.

function extractToken(req: Request): string | null {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) return null;
    const token = authHeader.slice(7).trim();
    return token.length > 0 ? token : null;
}

// ─── JWT verification (sync — jsonwebtoken is sync by default) ─────────────────

function verifyJwt(token: string): AuthenticatedUser {
    try {
        const decoded = jwt.verify(token, env.auth.jwtSecret, {
            algorithms: ['HS256'],
        }) as Record<string, unknown>;

        const rawRole = decoded.role as string;

        // ── Staff tokens (/staff/auth — web dashboard / mobile sales) ──────
        // Minted with the staff id in `sub` and a staff-vocabulary role.
        // Staff roles are first-class members of the ROLE hierarchy, so the
        // role passes through unmapped; the id comes from `sub`.
        if (isStaffRole(rawRole)) {
            return {
                id:        decoded.sub as string,
                phone:     (decoded.phone as string) ?? '',
                role:      rawRole as AuthenticatedUser['role'],
                staffRole: rawRole,
                branchId:  (decoded.branchId as string | null) ?? null,
                jti:       decoded.jti as string,
                iat:       decoded.iat as number,
                exp:       decoded.exp as number,
            };
        }

        // ── Customer/agent tokens (user-module) ────────────────────────────
        // User module issues tokens with userId field.
        // Business module AuthenticatedUser expects id.
        return {
            id:      (decoded.id ?? decoded.userId) as string,
            phone:   decoded.phone as string,
            role:    decoded.role as AuthenticatedUser['role'],
            agentId: decoded.agentId as string | undefined,
            jti:     decoded.jti as string,
            iat:     decoded.iat as number,
            exp:     decoded.exp as number,
        };
    } catch (err: unknown) {
        if (err instanceof jwt.TokenExpiredError) throw AUTH_ERRORS.expiredToken();
        if (err instanceof jwt.JsonWebTokenError) throw AUTH_ERRORS.invalidToken();
        throw AUTH_ERRORS.invalidToken();
    }
}

// ─── Denylist check (Redis) ────────────────────────────────────────────────────
// When a user logs out (user-module), their token's `jti` is written to Redis
// with TTL matching the token's remaining lifetime.
// We check this on every request — O(1) Redis GET is fast enough.

async function isTokenDenylisted(jti: string, isStaff: boolean): Promise<boolean> {
    try {
        const redis = getRedisClient();
        // Staff logout denylists under the staff-auth key namespace
        const key = isStaff
            ? RedisKeys.staffTokenDenylist(jti)
            : RedisKeys.tokenDenylist(jti);
        const result = await redis.get(key);
        return result !== null;
    } catch (err) {
        // Redis is unavailable — fail open (allow the request through).
        // This is a deliberate availability-over-strictness trade-off: a full
        // Redis outage should not lock out every user. The risk window is
        // bounded by the access token TTL (15 min), not indefinite.
        //
        // This is logged explicitly (not just relying on the Redis client's
        // own connection-error logs) so an outage during which denylist
        // checks are silently bypassed is actually visible/alertable in
        // production monitoring, rather than a silent gap nobody notices.
        log.error('Denylist check failed — failing open (request allowed)', {
            jti,
            isStaff,
            error: (err as Error).message,
        });
        return false;
    }
}

// ─── Middleware: verifyToken ───────────────────────────────────────────────────
// OPTIONAL by default — attaches req.user if a valid token is present.
// Does NOT reject the request if no token is found.
// Use `requireAuth` (below) on protected routes to enforce presence.

export function verifyToken() {
    return async (
        req: Request,
        res: Response,
        next: NextFunction,
    ): Promise<void> => {
        const token = extractToken(req);

        if (!token) {
            // No token — req.user remains undefined
            // The rbac middleware will reject if the route requires auth
            return next();
        }

        try {
            const payload = verifyJwt(token);

            // Check denylist — handles logout before token expiry
            if (await isTokenDenylisted(payload.jti, payload.staffRole !== undefined)) {
                throw AUTH_ERRORS.tokenRevoked();
            }

            req.user = payload;

            // Bind userId to the request logger — all subsequent logs carry it
            req.requestLogger = req.requestLogger.child({ userId: payload.id });

        } catch (err) {
            // Any auth error — pass to global error handler
            return next(err);
        }

        next();
    };
}

// ─── requireAuth ──────────────────────────────────────────────────────────────
// Lightweight guard — place AFTER verifyToken in the middleware stack.
// Rejects requests where verifyToken found no valid token.
// Do not duplicate JWT logic here — verifyToken already ran.

export function requireAuth() {
    return (req: Request, _res: Response, next: NextFunction): void => {
        if (!req.user) {
            return next(AUTH_ERRORS.missingToken());
        }
        next();
    };
}
