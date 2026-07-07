const jwt = require('jsonwebtoken');
const crypto = require('crypto');
<<<<<<< HEAD
const { JWT_EXPIRES_IN } = require('./constants');

// Generate token matching business module expected shape:
// { userId, phone, role, jti, iat, exp }
// jti = unique token ID — used for token revocation via blacklist
const generateToken = (userId, phone, role = 'CUSTOMER') => {
    const jti = crypto.randomUUID();

    return jwt.sign(
        { userId, phone, role, jti },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || JWT_EXPIRES_IN },
    );
};

const verifyToken = (token) => {
    return jwt.verify(token, process.env.JWT_SECRET);
};

module.exports = { generateToken, verifyToken };
=======

// Separate secrets for access and refresh tokens — a leaked access token
// must never be usable to mint refresh tokens, and vice versa.
//   JWT_ACCESS_SECRET  — signs short-lived access tokens
//   JWT_REFRESH_SECRET — signs long-lived refresh tokens
const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET;
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;

const ACCESS_EXPIRES_IN = process.env.JWT_ACCESS_EXPIRES_IN || '15m';
const REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '7d';

// Access token payload (frontend-facing claims): { sub, phone, role, name }.
// We additionally embed `userId` and `jti` so the existing business-module
// token middleware (which reads decoded.userId and decoded.jti) keeps working
// without any change. These extra claims are invisible to the mobile client.
const generateAccessToken = (user) => {
  return jwt.sign(
    {
      sub: user.id,
      userId: user.id,
      phone: user.phone,
      role: user.role,
      name: user.name || '',
      jti: crypto.randomUUID(),
    },
    ACCESS_SECRET,
    { expiresIn: ACCESS_EXPIRES_IN },
  );
};

const generateRefreshToken = (userId) => {
  return jwt.sign(
    { sub: userId, jti: crypto.randomUUID() },
    REFRESH_SECRET,
    { expiresIn: REFRESH_EXPIRES_IN },
  );
};

const verifyAccessToken = (token) => jwt.verify(token, ACCESS_SECRET);
const verifyRefreshToken = (token) => jwt.verify(token, REFRESH_SECRET);

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
};
>>>>>>> origin/main
