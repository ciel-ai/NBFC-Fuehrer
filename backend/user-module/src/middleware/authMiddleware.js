const prisma = require('../config/prismaClient');
const AppError = require('../utils/appError');
const { verifyAccessToken } = require('../utils/jwtUtils');
const { hashToken } = require('../utils/tokenUtils');

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

    // Previously isActive was never checked here at all — there was no way
    // to deactivate a compromised/offboarded customer account short of a
    // manual DB edit, and even if isActive were ever set false by some
    // future mechanism, existing JWTs (7-day life) would keep working
    // indefinitely since this middleware never re-checked status.
    // Run alongside the blacklist check rather than after it, so this
    // doesn't add sequential latency to every authenticated request.
    const [blacklistedToken, user] = await Promise.all([
      prisma.tokenBlacklist.findUnique({ where: { tokenHash } }),
      prisma.user.findUnique({ where: { id: userId }, select: { isActive: true } }),
    ]);

    if (blacklistedToken && blacklistedToken.expiresAt > new Date()) {
      throw new AppError('Token has been invalidated. Please log in again.', 401);
    }

    if (!user || !user.isActive) {
      throw new AppError('Account is deactivated. Please contact support.', 401);
    }

    req.token = token;
    // Access tokens carry the user id in `sub` (per the auth spec); older code
    // and the KYC controllers read `req.user.userId`, so we expose both.
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
