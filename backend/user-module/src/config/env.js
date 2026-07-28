// src/config/env.js
//
// Validates all required environment variables at startup.
// The app will refuse to start if any required variable is missing.
// This prevents silent failures where a missing key causes a crash
// only when the first real request hits that code path.

const REQUIRED = [
    'DATABASE_URL',
    'REDIS_URL',
    'JWT_ACCESS_SECRET',
    'JWT_REFRESH_SECRET',
    'ENCRYPTION_KEY',
];

const PRODUCTION_REQUIRED = [
    'TWILIO_ACCOUNT_SID',
    'TWILIO_AUTH_TOKEN',
    'TWILIO_PHONE_NUMBER',
];

const validateEnv = () => {
    const missing = [];

    // Always required — app cannot start without these
    for (const key of REQUIRED) {
        if (!process.env[key]) {
            missing.push(key);
        }
    }

    // Required in production only
    if (process.env.NODE_ENV === 'production') {
        for (const key of PRODUCTION_REQUIRED) {
            if (!process.env[key]) {
                missing.push(key);
            }
        }
    }

    if (missing.length > 0) {
        console.error('\n❌ Missing required environment variables:');
        missing.forEach((key) => console.error(`   - ${key}`));
        console.error('\nAdd them to your .env file and restart.\n');
        process.exit(1);
    }

    // Validate ENCRYPTION_KEY length — must be 32 bytes (64 hex chars or 44 base64 chars)
    const rawKey = process.env.ENCRYPTION_KEY;
    const isHex    = /^[a-fA-F0-9]{64}$/.test(rawKey);
    const isBase64 = Buffer.from(rawKey, 'base64').length === 32;

    if (!isHex && !isBase64) {
        console.error('\n❌ ENCRYPTION_KEY must be 64 hex characters or 32-byte base64 string.');
        console.error('   Generate one with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"');
        console.error('');
        process.exit(1);
    }

    // Validate JWT secret lengths — minimum 32 characters each, and they must
    // be different from one another (a leaked access secret must not be able to
    // forge refresh tokens).
    const jwtSecrets = {
        JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET,
        JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET,
    };

    for (const [key, value] of Object.entries(jwtSecrets)) {
        if (value.length < 32) {
            console.error(`\n❌ ${key} must be at least 32 characters long.`);
            console.error('   Generate one with: node -e "console.log(require(\'crypto\').randomBytes(64).toString(\'hex\'))"');
            console.error('');
            process.exit(1);
        }
    }

    if (jwtSecrets.JWT_ACCESS_SECRET === jwtSecrets.JWT_REFRESH_SECRET) {
        console.error('\n❌ JWT_ACCESS_SECRET and JWT_REFRESH_SECRET must be different values.');
        console.error('');
        process.exit(1);
    }

    console.log('✅ Environment variables validated.');
};

module.exports = { validateEnv };