const prisma = require('../config/prismaClient');
const AppError = require('../utils/appError');
<<<<<<< HEAD
const { verifyToken } = require('../utils/jwtUtils');
=======
const { verifyAccessToken } = require('../utils/jwtUtils');
>>>>>>> origin/main
const { hashToken } = require('../utils/tokenUtils');

const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AppError('Authorization header with Bearer token is required.', 401);
    }

    const token = authHeader.split(' ')[1];
<<<<<<< HEAD
    const decoded = verifyToken(token);
=======
    const decoded = verifyAccessToken(token);
>>>>>>> origin/main
    const tokenHash = hashToken(token);
    const blacklistedToken = await prisma.tokenBlacklist.findUnique({
      where: { tokenHash },
    });

    if (blacklistedToken && blacklistedToken.expiresAt > new Date()) {
      throw new AppError('Token has been invalidated. Please log in again.', 401);
    }

    req.token = token;
<<<<<<< HEAD
    req.user = {
      userId: decoded.userId,
      phone: decoded.phone,
=======
    // Access tokens carry the user id in `sub` (per the auth spec); older code
    // and the KYC controllers read `req.user.userId`, so we expose both.
    req.user = {
      userId: decoded.sub || decoded.userId,
      phone: decoded.phone,
      role: decoded.role,
>>>>>>> origin/main
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
