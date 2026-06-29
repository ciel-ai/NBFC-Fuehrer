const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const AppError = require('../utils/appError');
const logger = require('../utils/logger');
const otpService = require('./otpService');
const { normalizePhone } = require('../utils/phoneUtils');

const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.BUSINESS_DATABASE_URL || process.env.DATABASE_URL });
const query = (text, params) => pool.query(text, params);

const PORTAL_ROLE_PREFIX = {
    CREDIT: 'CREDIT_',
    FINANCE: 'FINANCE_',
    SALES: 'SALES_',
};

const staffLogin = async (username, password) => {
    const { rows } = await query(
        `SELECT * FROM admin_users WHERE username = $1 AND is_active = true LIMIT 1`,
        [username.toLowerCase().trim()]
    );
    if (!rows.length) throw new AppError('Invalid username or password.', 401);
    const staff = rows[0];
    if (!staff.password_hash) throw new AppError('Account not set up. Contact admin.', 401);
    const isMatch = await bcrypt.compare(password, staff.password_hash);
    if (!isMatch) throw new AppError('Invalid username or password.', 401);
    await query(`UPDATE admin_users SET last_login_at = NOW() WHERE id = $1`, [staff.id]);
    const jti = crypto.randomUUID();
    const token = jwt.sign(
        { userId: staff.id, username: staff.username, role: staff.role, product: staff.product, jti, aud: 'web' },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );
    logger.info({ message: 'Staff logged in.', staffId: staff.id, role: staff.role });
    return { token, mustChangePassword: staff.must_change_password, staff: buildStaffResponse(staff) };
};

const requestPortalOtp = async (phone, portal) => {
    if (!['CREDIT', 'FINANCE', 'SALES'].includes(portal)) {
        throw new AppError('Invalid portal. Must be CREDIT, FINANCE, or SALES.', 400);
    }
    const normalizedPhone = normalizePhone(phone);
    const prefix = PORTAL_ROLE_PREFIX[portal];

    const { rows } = await query(
        `SELECT * FROM admin_users WHERE phone = $1 AND is_active = true LIMIT 1`,
        [normalizedPhone]
    );
    if (!rows.length) throw new AppError('No active account found for this phone number.', 404);
    const staff = rows[0];

    if (staff.role.startsWith('SALES_') && portal !== 'SALES') {
        const err = new AppError('Sales users must use the mobile app to login.', 403);
        err.errorCode = 'SALES_USES_MOBILE_APP';
        throw err;
    }
    if (portal === 'SALES') {
        const err = new AppError('Sales login is only available via the mobile app.', 403);
        err.errorCode = 'SALES_USES_MOBILE_APP';
        throw err;
    }
    if (!staff.role.startsWith(prefix)) {
        const err = new AppError(`This account does not have access to ${portal} portal.`, 403);
        err.errorCode = 'WRONG_PORTAL';
        throw err;
    }
    if (staff.status !== 'ACTIVE') {
        const err = new AppError('User account is deactivated.', 403);
        err.errorCode = 'USER_DEACTIVATED';
        throw err;
    }

    const otpPayload = await otpService.issueOtp(normalizedPhone);
    logger.info({ message: 'Portal OTP issued.', staffId: staff.id, portal });
    return { phone: normalizedPhone, portal, expiresAt: otpPayload.expiresAt, otp: otpPayload.otp };
};

const verifyPortalOtp = async (phone, otp, portal) => {
    const normalizedPhone = normalizePhone(phone);
    const prefix = PORTAL_ROLE_PREFIX[portal];

    const { rows } = await query(
        `SELECT * FROM admin_users WHERE phone = $1 AND is_active = true LIMIT 1`,
        [normalizedPhone]
    );
    if (!rows.length) throw new AppError('No active account found.', 404);
    const staff = rows[0];

    if (!staff.role.startsWith(prefix)) {
        const err = new AppError(`Role mismatch for ${portal} portal.`, 403);
        err.errorCode = 'WRONG_PORTAL';
        throw err;
    }

    await otpService.consumeOtp(normalizedPhone, otp);
    await query(`UPDATE admin_users SET last_login_at = NOW() WHERE id = $1`, [staff.id]);

    const jti = crypto.randomUUID();
    const token = jwt.sign(
        { userId: staff.id, username: staff.username, role: staff.role, product: staff.product, jti, aud: 'web' },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );
    logger.info({ message: 'Portal OTP verified.', staffId: staff.id, role: staff.role });
    return { token, staff: buildStaffResponse(staff) };
};

const changePassword = async (staffId, currentPassword, newPassword) => {
    const { rows } = await query(
        `SELECT * FROM admin_users WHERE id = $1 AND is_active = true LIMIT 1`,
        [staffId]
    );
    if (!rows.length) throw new AppError('Staff not found.', 404);
    const isMatch = await bcrypt.compare(currentPassword, rows[0].password_hash);
    if (!isMatch) throw new AppError('Current password is incorrect.', 400);
    const hash = await bcrypt.hash(newPassword, 12);
    await query(
        `UPDATE admin_users SET password_hash = $1, must_change_password = false, updated_at = NOW() WHERE id = $2`,
        [hash, staffId]
    );
    logger.info({ message: 'Staff password changed.', staffId });
    return { changed: true };
};

const getStaffProfile = async (staffId) => {
    const { rows } = await query(
        `SELECT * FROM admin_users WHERE id = $1 AND is_active = true LIMIT 1`,
        [staffId]
    );
    if (!rows.length) throw new AppError('Staff not found.', 404);
    return { staff: buildStaffResponse(rows[0]) };
};

const buildStaffResponse = (staff) => ({
    id: staff.id,
    fullName: staff.full_name,
    username: staff.username,
    email: staff.email,
    phone: staff.phone,
    role: staff.role,
    product: staff.product,
    branchId: staff.branch_id,
    department: staff.department,
    mustChangePassword: staff.must_change_password,
    lastLoginAt: staff.last_login_at,
    createdAt: staff.created_at,
});

module.exports = { staffLogin, changePassword, getStaffProfile, requestPortalOtp, verifyPortalOtp };