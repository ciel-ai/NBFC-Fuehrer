const express = require('express');
const cors = require('cors');
<<<<<<< HEAD
const userRoutes = require('./routes/userRoutes');
const kycRoutes = require('./routes/kycRoutes');
const staffRoutes = require('./routes/staffRoutes');
=======
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const kycRoutes = require('./routes/kycRoutes');
>>>>>>> origin/main
const notFound = require('./middleware/notFound');
const errorHandler = require('./middleware/errorHandler');

const app = express();

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: false }));

<<<<<<< HEAD
app.use('/api/users', userRoutes);
app.use('/api/kyc', kycRoutes);
app.use('/staff', staffRoutes);
=======
// Auth endpoints the mobile app talks to: /auth/send-otp, /auth/verify-otp,
// /auth/refresh, /auth/logout, /auth/me.
app.use('/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/kyc', kycRoutes);
>>>>>>> origin/main

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
