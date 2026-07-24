const jwt = require('jsonwebtoken');
const crypto = require('crypto');

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
    { expiresIn: ACCESS_EXPIRES_IN, algorithm: 'HS256' },
  );
};

const generateRefreshToken = (userId) => {
  return jwt.sign(
    { sub: userId, jti: crypto.randomUUID() },
    REFRESH_SECRET,
    { expiresIn: REFRESH_EXPIRES_IN, algorithm: 'HS256' },
  );
};

// Previously called with no algorithms option at all — jsonwebtoken's
// verify() then trusts whatever algorithm the token's own header claims,
// a classic JWT "alg confusion" attack vector. Explicitly restricting to
// HS256 means verify() rejects any token using a different algorithm,
// regardless of what its header says.
const verifyAccessToken = (token) => jwt.verify(token, ACCESS_SECRET, { algorithms: ['HS256'] });
const verifyRefreshToken = (token) => jwt.verify(token, REFRESH_SECRET, { algorithms: ['HS256'] });

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
};
