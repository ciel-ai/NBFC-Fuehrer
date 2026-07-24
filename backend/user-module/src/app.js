const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const kycRoutes = require('./routes/kycRoutes');
const notFound = require('./middleware/notFound');
const errorHandler = require('./middleware/errorHandler');

const app = express();

// Previously missing entirely — business-module already uses helmet, but
// user-module (which handles auth/OTP/KYC) had no security headers at all.
app.use(helmet({
    contentSecurityPolicy: process.env.NODE_ENV === 'production',
    crossOriginEmbedderPolicy: false,
}));

// Previously app.use(cors()) with zero options — the cors package's
// documented default behavior with no config is to reflect and allow
// ANY origin. Restrict to an explicit allowlist in production; allow all
// in development/test so local tooling and the mobile app's dev client
// keep working without extra setup.
const allowedOrigins = (process.env.CORS_ALLOWED_ORIGINS ?? '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

app.use(cors({
    origin(origin, callback) {
        if (process.env.NODE_ENV !== 'production') return callback(null, true);
        if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
        callback(new Error('Not allowed by CORS'));
    },
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: false }));

// Auth endpoints the mobile app talks to: /auth/send-otp, /auth/verify-otp,
// /auth/refresh, /auth/logout, /auth/me.
app.use('/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/kyc', kycRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Service is healthy.',
    data: { status: 'OK' },
  });
});

app.use(notFound);
app.use(errorHandler);

module.exports = app;
