// src/config/logger.ts
import winston from 'winston';
import { env } from './env';

// ─── Custom log levels ─────────────────────────────────────────────────────────
// http level sits between info and debug — captures all HTTP traffic

// ─── Sensitive data masking ────────────────────────────────────────────────────
// Masks Aadhaar, PAN, phone numbers and other PII in logs before they're written.
// RBI requires that audit logs do not contain raw PII.

const SENSITIVE_KEYS = [
    'aadhaar', 'aadhaarNumber', 'aadhaar_number', 'aadhaarNo',
    'pan', 'panNumber', 'pan_number',
    'phone', 'mobile', 'phoneNumber', 'phone_number',
    'password', 'passwordHash', 'password_hash',
    'token', 'accessToken', 'refreshToken', 'access_token', 'refresh_token',
    'otp', 'otpCode', 'otp_code',
    'cvv', 'cardNumber', 'card_number',
    'accountNumber', 'account_number',
    'ifsc',
    // Derived PII returned by KYC vendors (Perfios name/DOB on Aadhaar/PAN
    // verification responses). Note: full customer 'address' is deliberately
    // NOT added as a generic substring here — it would also catch ipAddress,
    // which audit logging depends on for security forensics. The real fix
    // for raw vendor response dumps is at the call site (kycVerify/live.ts),
    // not broader masking rules.
    'nameOnAadhaar', 'nameOnPan',
    'dob', 'dateOfBirth', 'date_of_birth',
];

function maskValue(key: string, value: any): any {
    if (typeof value === 'string') {
        if (key.toLowerCase().includes('aadhaar')) {
            return `XXXX-XXXX-${value.slice(-4)}`;
        }
        if (key.toLowerCase().includes('pan')) {
            return `${value.slice(0, 2)}XXXXX${value.slice(-2)}`;
        }
        if (key.toLowerCase().includes('phone') || key.toLowerCase().includes('mobile')) {
            return `XXXXXX${value.slice(-4)}`;
        }
        if (key.toLowerCase().includes('password') || key.toLowerCase().includes('token') || key.toLowerCase().includes('otp')) {
            return '[REDACTED]';
        }
        if (key.toLowerCase().includes('account_number') || key.toLowerCase().includes('accountnumber')) {
            return `XXXXXX${value.slice(-4)}`;
        }
        // Derived PII from KYC vendor responses — exact-key match only
        // (not a substring match) to avoid collaterally redacting harmless
        // fields like roleName, fileName, errorName, or ipAddress.
        const exactKey = key.toLowerCase();
        if (['nameonaadhaar', 'nameonpan', 'dob', 'dateofbirth', 'date_of_birth'].includes(exactKey)) {
            return '[REDACTED]';
        }
    }
    return value;
}

function maskSensitiveData(obj: any): any {
    if (!obj || typeof obj !== 'object') return obj;
    if (Array.isArray(obj)) return obj.map(maskSensitiveData);

    const masked: any = {};
    for (const [key, value] of Object.entries(obj)) {
        const lowerKey = key.toLowerCase();
        if (SENSITIVE_KEYS.some(k => lowerKey.includes(k.toLowerCase()))) {
            masked[key] = maskValue(key, value);
        } else if (typeof value === 'object') {
            masked[key] = maskSensitiveData(value);
        } else {
            masked[key] = value;
        }
    }
    return masked;
}

const maskingFormat = winston.format((info) => {
    return maskSensitiveData(info);
})();

const levels = {
    error: 0,
    warn: 1,
    info: 2,
    http: 3,
    debug: 4,
};

// ─── Formatters ────────────────────────────────────────────────────────────────

// Production: structured JSON — CloudWatch can index and query every field
const jsonFormat = winston.format.combine(
    maskingFormat,
    winston.format.timestamp({ format: 'YYYY-MM-DDTHH:mm:ss.SSSZ' }),
    winston.format.errors({ stack: true }),
    winston.format.json(),
);

// Development: human-readable coloured output
const prettyFormat = winston.format.combine(
    maskingFormat,
    winston.format.timestamp({ format: 'HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.printf(({ timestamp, level, message, ...meta }) => {
        const metaStr = Object.keys(meta).length
            ? '\n' + JSON.stringify(meta, null, 2)
            : '';
        return `${timestamp} [${level}] ${message}${metaStr}`;
    }),
);

// ─── Transports ────────────────────────────────────────────────────────────────

const transports: winston.transport[] = [
    // Always write to stdout — App Runner / CloudWatch captures this
    new winston.transports.Console({
        format: env.logging.pretty ? prettyFormat : jsonFormat,
    }),
];

// In production, also write errors to a separate stream
// (useful for CloudWatch filter metrics on error volume)
if (env.isProd) {
    transports.push(
        new winston.transports.Console({
            level: 'error',
            format: winston.format.combine(
                winston.format.label({ label: 'ERROR_STREAM' }),
                jsonFormat,
            ),
        }),
    );
}

// ─── Logger instance ───────────────────────────────────────────────────────────

export const logger = winston.createLogger({
    level: env.logging.level,
    levels,
    transports,
    // Never crash the process on uncaught logger errors
    exitOnError: false,
    // Default fields added to every log entry
    defaultMeta: {
        service: env.appName,
        env: env.nodeEnv,
    },
});

// ─── Child logger factory ──────────────────────────────────────────────────────
// Use child loggers in each module for automatic context tagging
// e.g. const log = createModuleLogger('loans');
// log.info('Loan created') → { service, env, module: 'loans', message: '...' }

export function createModuleLogger(module: string) {
    return logger.child({ module });
}

// ─── Request logger factory ────────────────────────────────────────────────────
// Creates a per-request child logger with requestId bound
// Used by requestLogger middleware — every log in a request chain
// carries the same requestId for CloudWatch log correlation

export function createRequestLogger(requestId: string, userId?: string) {
    return logger.child({
        requestId,
        ...(userId ? { userId } : {}),
    });
}

// ─── Unhandled rejection / exception capture ───────────────────────────────────
// These should NEVER happen in production — log them before the process crashes

logger.exceptions.handle(
    new winston.transports.Console({
        format: jsonFormat,
    }),
);

logger.rejections.handle(
    new winston.transports.Console({
        format: jsonFormat,
    }),
);

export type Logger = ReturnType<typeof createModuleLogger>;