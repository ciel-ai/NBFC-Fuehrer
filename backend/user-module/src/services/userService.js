const prisma = require('../config/prismaClient');
const otpService = require('./otpService');
const AppError = require('../utils/appError');
const {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
} = require('../utils/jwtUtils');
const logger = require('../utils/logger');
const { normalizePhone } = require('../utils/phoneUtils');
const { buildUserResponse } = require('../utils/userPresenter');
const { hashToken } = require('../utils/tokenUtils');
const { toClientRole, isSalesRole, roleToProduct } = require('../utils/roleUtils');

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

// The mobile app's OTP-resend countdown expects this many seconds.
const OTP_EXPIRES_IN_SECONDS = 300;

// The KYC module historically wrote upper-case "PENDING"/"VERIFIED"; the mobile
// app expects lower-case states (none | started | in_progress | verified).
// Legacy "PENDING" maps to "none" (i.e. "not started" from the app's view).
const toClientKycStatus = (status) => {
  const normalized = String(status || 'none').toLowerCase();
  return normalized === 'pending' ? 'none' : normalized;
};

const persistRefreshToken = (userId, refreshToken) =>
  prisma.refreshToken.create({
    data: {
      tokenHash: hashToken(refreshToken),
      userId,
      expiresAt: new Date(Date.now() + SEVEN_DAYS_MS),
    },
  });

const registerUser = async (phone, role = 'CUSTOMER') => {
  const normalizedPhone = normalizePhone(phone);
  const existingUser = await prisma.user.findUnique({
    where: {
      phone: normalizedPhone,
    },
  });

  if (existingUser) {
    throw new AppError('User already exists with this phone number.', 409);
  }

  const user = await prisma.user.create({
    data: {
      phone: normalizedPhone,
      role,
    },
  });
  logger.info({
    message: 'User registered successfully.',
    userId: user.id,
    phone: user.phone,
  });

  return {
    user: buildUserResponse(user),
  };
};

const sendOtp = async (phone) => {
  const normalizedPhone = normalizePhone(phone);

  // Auto-create a customer if this phone is unknown — customers self-register
  // through this flow. Sales agents are pre-seeded and simply match here.
  // Never throw 404 for an unknown phone.
  let user = await prisma.user.findUnique({
    where: { phone: normalizedPhone },
  });

  if (!user) {
    user = await prisma.user.create({
      data: { phone: normalizedPhone, role: 'CUSTOMER' },
    });
    logger.info({ message: 'Auto-registered new customer', userId: user.id });
  }

  // otpService logs the OTP to the console in dev and sends via MSG91 in prod.
  await otpService.issueOtp(normalizedPhone);

  // Never return the OTP itself in the response.
  return {
    phone: normalizedPhone,
    expiresIn: OTP_EXPIRES_IN_SECONDS,
  };
};

const verifyOtp = async (phone, otp) => {
  const normalizedPhone = normalizePhone(phone);

  const user = await prisma.user.findUnique({
    where: { phone: normalizedPhone },
    include: { agent: true },
  });

  if (!user) {
    throw new AppError('User not found.', 404);
  }

  // Existing otpService handles expiry + bcrypt comparison and throws on failure.
  await otpService.consumeOtp(normalizedPhone, otp);

  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken(user.id);

  await persistRefreshToken(user.id, refreshToken);

  const clientRole = toClientRole(user.role);
  const isSales = isSalesRole(user.role);
  const kycStatus = toClientKycStatus(user.kycStatus);

  logger.info({
    message: 'OTP verified successfully.',
    userId: user.id,
    phone: user.phone,
  });

  const responseData = {
    accessToken,
    refreshToken,
    user: {
      id: user.id,
      phone: user.phone,
      name: user.name ?? '',
      role: clientRole,
      kycStatus,
    },
    kycComplete: isSales ? true : kycStatus === 'verified',
  };

  // Attach the agent profile only for sales roles.
  if (isSales && user.agent) {
    responseData.agent = {
      id: user.agent.id,
      name: user.agent.name,
      product: roleToProduct(user.role),
      branch: user.agent.branch,
      fdoCode: user.agent.fdoCode,
    };
  }

  return responseData;
};

// Rotate refresh tokens: validate the presented token, revoke it, and issue a
// brand-new access + refresh pair. Any failure surfaces as 401 to the caller.
const refreshTokens = async (refreshToken) => {
  if (!refreshToken) {
    throw new AppError('Refresh token is required.', 401);
  }

  let decoded;
  try {
    decoded = verifyRefreshToken(refreshToken);
  } catch (err) {
    throw new AppError('Invalid or expired refresh token.', 401);
  }

  const tokenHash = hashToken(refreshToken);

  const stored = await prisma.refreshToken.findUnique({ where: { tokenHash } });
  if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
    throw new AppError('Refresh token is invalid, expired, or revoked.', 401);
  }

  // Honour the shared blacklist too (logout writes refresh hashes there).
  const blacklisted = await prisma.tokenBlacklist.findUnique({ where: { tokenHash } });
  if (blacklisted && blacklisted.expiresAt > new Date()) {
    throw new AppError('Refresh token has been revoked.', 401);
  }

  const user = await prisma.user.findUnique({ where: { id: decoded.sub } });
  if (!user) {
    throw new AppError('User not found.', 401);
  }

  const accessToken = generateAccessToken(user);
  const newRefreshToken = generateRefreshToken(user.id);

  await prisma.$transaction([
    prisma.refreshToken.update({
      where: { tokenHash },
      data: { revokedAt: new Date() },
    }),
    prisma.refreshToken.create({
      data: {
        tokenHash: hashToken(newRefreshToken),
        userId: user.id,
        expiresAt: new Date(Date.now() + SEVEN_DAYS_MS),
      },
    }),
  ]);

  logger.info({ message: 'Tokens refreshed.', userId: user.id });

  return {
    accessToken,
    refreshToken: newRefreshToken,
  };
};

const loginUser = async (phone) => {
  return sendOtp(phone);
};

const logoutUser = async (userId, token, tokenExp, refreshToken) => {
  const user = await prisma.user.findUnique({
    where: {
      id: userId,
    },
  });

  if (!user) {
    throw new AppError('User not found.', 404);
  }

  // Blacklist the access token.
  const tokenHash = hashToken(token);
  const expiresAt = tokenExp
    ? new Date(tokenExp * 1000)
    : new Date(Date.now() + SEVEN_DAYS_MS);

  await prisma.tokenBlacklist.upsert({
    where: { tokenHash },
    update: { expiresAt },
    create: { tokenHash, userId, expiresAt },
  });

  // Blacklist + revoke the refresh token if the client supplied one.
  if (refreshToken) {
    const refreshHash = hashToken(refreshToken);
    let refreshExpiresAt = new Date(Date.now() + SEVEN_DAYS_MS);
    try {
      const decoded = verifyRefreshToken(refreshToken);
      if (decoded.exp) {
        refreshExpiresAt = new Date(decoded.exp * 1000);
      }
    } catch (err) {
      // Still blacklist by hash even if the token can't be verified.
    }

    await prisma.refreshToken.updateMany({
      where: { tokenHash: refreshHash, revokedAt: null },
      data: { revokedAt: new Date() },
    });

    await prisma.tokenBlacklist.upsert({
      where: { tokenHash: refreshHash },
      update: { expiresAt: refreshExpiresAt },
      create: { tokenHash: refreshHash, userId, expiresAt: refreshExpiresAt },
    });
  }

  logger.info({
    message: 'User logged out successfully.',
    userId,
  });

  return {
    loggedOut: true,
  };
};

// Flat shape consumed by GET /auth/me (role + kycStatus are always lowercase).
const getProfile = async (userId) => {
  const user = await prisma.user.findUnique({
    where: {
      id: userId,
    },
  });

  if (!user) {
    throw new AppError('User not found.', 404);
  }

  return {
    id: user.id,
    phone: user.phone,
    name: user.name ?? '',
    role: toClientRole(user.role),
    kycStatus: toClientKycStatus(user.kycStatus),
  };
};

const updateProfile = async (userId, payload) => {
  const existingUser = await prisma.user.findUnique({
    where: {
      id: userId,
    },
  });

  if (!existingUser) {
    throw new AppError('User not found.', 404);
  }

  const user = await prisma.user.update({
    where: {
      id: userId,
    },
    data: {
      name: Object.prototype.hasOwnProperty.call(payload, 'name') ? payload.name : existingUser.name,
      email: Object.prototype.hasOwnProperty.call(payload, 'email') ? payload.email : existingUser.email,
    },
  });

  logger.info({
    message: 'User profile updated successfully.',
    userId,
  });

  return {
    user: buildUserResponse(user),
  };
};

const getUserById = async (userId) => {
  const user = await prisma.user.findUnique({
    where: {
      id: userId,
    },
  });

  if (!user) {
    throw new AppError('User not found.', 404);
  }

  return {
    user: buildUserResponse(user),
  };
};

// Deactivate/reactivate a customer account. Called only via the internal
// service-to-service endpoint below — the audit found there was no code
// path anywhere that ever set isActive: false, meaning authMiddleware's
// deactivation check (which does work correctly) had nothing that could
// ever actually trigger it.
const setUserActiveStatus = async (userId, isActive) => {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new AppError('User not found.', 404);
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data: { isActive },
  });

  logger.info({ message: 'User active status changed', userId, isActive });
  return { user: buildUserResponse(updated) };
};

module.exports = {
  registerUser,
  sendOtp,
  verifyOtp,
  refreshTokens,
  loginUser,
  logoutUser,
  getProfile,
  updateProfile,
  getUserById,
  setUserActiveStatus,
};
