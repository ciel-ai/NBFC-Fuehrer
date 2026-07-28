const prisma = require('../config/prismaClient');
const AppError = require('../utils/appError');
const { verifyAccessToken } = require('../utils/jwtUtils');
const { hashToken } = require('../utils/tokenUtils');
const { getRedisClient } = require('../config/redisClient');

const BLACKLIST_TTL_SECONDS = 60 * 60 * 24 * 7;

async function isTokenBlacklisted(tokenHash, tokenExpMs) {
    const redis = getRedisClient();
    const key = `bl:${tokenHash}`;

    try {
        const cached = await redis.get(key);
        if (cached !== null) return cached === '1';
    } catch {
        // Redis unavailable — fall through to DB
    }

    const row = await prisma.tokenBlacklist.findUnique({ where: { tokenHash } });
    const blacklisted = !!(row && row.expiresAt > new Date());

    try {
        const ttl = Math.max(1, Math.floor((tokenExpMs - Date.now()) / 1000));
        await redis.set(key, blacklisted ? '1' : '0', 'EX', Math.min(ttl, BLACKLIST_TTL_SECONDS));
    } catch {
        // Redis write failure is non-fatal
    }

    return blacklisted;
}

const authMiddleware = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            throw new AppError('Authorization header with Bearer token is required.', 401);
        }

        const token = authHeader.split(' ')[1];
        const decoded = verifyAccessToken(token);
        const tokenHash = hashToken(token);
        const userId = decoded.sub || decoded.userId;

        const [blacklisted, user] = await Promise.all([
            isTokenBlacklisted(tokenHash, decoded.exp * 1000),
            prisma.user.findUnique({ where: { id: userId }, select: { isActive: true } }),
        ]);

        if (blacklisted) {
            throw new AppError('Token has been invalidated. Please log in again.', 401);
        }

        if (!user || !user.isActive) {
            throw new AppError('Account is deactivated. Please contact support.', 401);
        }

        req.token = token;
        req.user = {
            userId,
            phone: decoded.phone,
            role: decoded.role,
            exp: decoded.exp,
            iat: decoded.iat,
        };

        next();
    } catch (error) {
        if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
            return next(new AppError('Invalid or expired token.', 401));
        }
        return next(error);
    }
};

module.exports = authMiddleware;