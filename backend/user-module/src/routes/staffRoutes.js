const express = require('express');
const router = express.Router();
const { login, updatePassword, getMe } = require('../controllers/staffController');
const { verifyToken } = require('../utils/jwtUtils');
const AppError = require('../utils/appError');

// Middleware — verify JWT for protected routes
const requireStaffAuth = (req, res, next) => {
    try {
        const header = req.headers.authorization;
        if (!header || !header.startsWith('Bearer ')) throw new AppError('Unauthorized.', 401);
        const token = header.split(' ')[1];
        const decoded = verifyToken(token);
        req.user = decoded;
        next();
    } catch (err) {
        next(new AppError('Unauthorized.', 401));
    }
};

// Public
router.post('/login', login);

// Protected
router.post('/change-password', requireStaffAuth, updatePassword);
router.get('/me', requireStaffAuth, getMe);

module.exports = router;