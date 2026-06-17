const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const AppError = require('../utils/appError');
const logger = require('../utils/logger');

// Raw DB via pg since admin_users is not in Prisma schema
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.BUSINESS_DATABASE_URL || process.env.DATABASE_URL });

const query = (text, params) => pool.query(text, params);

// ── Login ─────────────────────────────────────────────────────────────────────
const staffLogin = async (username, password) => {
    const { rows } = await query(
        `SELECT * FROM admin_users WHERE username = $1 AND is_active = true LIMIT 1`,
        [username.toLowerCase().trim()]
    );

    if (!rows.length) {
        throw new AppError('Invalid username or password.', 401);
    }

    const staff = rows[0];

    if (!staff.password_hash) {
        throw new AppError('Account not set up. Contact admin.', 401);
    }

    const isMatch = await bcrypt.compare(password, staff.password_hash);
    if (!isMatch) {
        throw new AppError('Invalid username or password.', 401);
    }

    // Update last login
    await query(
        `UPDATE admin_users SET last_login_at = NOW() WHERE id = $1`,
        [staff.id]
    );

    const jti = crypto.randomUUID();
    const token = jwt.sign(
        { userId: staff.id, username: staff.username, role: staff.role, product: staff.product, jti },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    logger.info({ message: 'Staff logged in.', staffId: staff.id, role: staff.role });

    return {
        token,
        mustChangePassword: staff.must_change_password,
        staff: buildStaffResponse(staff),
    };
};

// ── Change password ───────────────────────────────────────────────────────────
const changePassword = async (staffId, currentPassword, newPassword) => {
    const { rows } = await query(
        `SELECT * FROM admin_users WHERE id = $1 AND is_active = true LIMIT 1`,
        [staffId]
    );

    if (!rows.length) throw new AppError('Staff not found.', 404);
    const staff = rows[0];

    const isMatch = await bcrypt.compare(currentPassword, staff.password_hash);
    if (!isMatch) throw new AppError('Current password is incorrect.', 400);

    const hash = await bcrypt.hash(newPassword, 12);
    await query(
        `UPDATE admin_users SET password_hash = $1, must_change_password = false, updated_at = NOW() WHERE id = $2`,
        [hash, staffId]
    );

    logger.info({ message: 'Staff password changed.', staffId });
    return { changed: true };
};

// ── Get profile ───────────────────────────────────────────────────────────────
const getStaffProfile = async (staffId) => {
    const { rows } = await query(
        `SELECT * FROM admin_users WHERE id = $1 AND is_active = true LIMIT 1`,
        [staffId]
    );
    if (!rows.length) throw new AppError('Staff not found.', 404);
    return { staff: buildStaffResponse(rows[0]) };
};

// ── Helper ────────────────────────────────────────────────────────────────────
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

module.exports = { staffLogin, changePassword, getStaffProfile };