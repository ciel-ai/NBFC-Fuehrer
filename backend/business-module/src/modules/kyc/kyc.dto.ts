// src/modules/kyc/kyc.dto.ts
import Joi from 'joi';
import { commonSchemas } from '@/middlewares';
import { KYC_STATUS } from '@/config/constants';

// ─── Initiate KYC ─────────────────────────────────────────────────────────────

export const initiateKycSchema = Joi.object({
    fullName: Joi.string()
        .trim()
        .min(2)
        .max(100)
        .pattern(/^[a-zA-Z\s.'-]+$/)
        .required()
        .messages({
            'string.pattern.base': 'Full name must contain only letters, spaces, dots, hyphens and apostrophes',
        }),

    dob: Joi.string()
        .pattern(/^\d{4}-\d{2}-\d{2}$/)
        .required()
        .custom((value, helpers) => {
            const dob = new Date(value);
            const now = new Date();
            const age = now.getFullYear() - dob.getFullYear();
            if (isNaN(dob.getTime())) return helpers.error('date.invalid');
            if (age < 18) return helpers.error('date.tooYoung');
            if (age > 75) return helpers.error('date.tooOld');
            return value;
        })
        .messages({
            'date.invalid': 'Date of birth must be a valid date',
            'date.tooYoung': 'Applicant must be at least 18 years old',
            'date.tooOld': 'Applicant must be under 75 years old',
        }),

    phone: commonSchemas.phone.required(),

    pan: commonSchemas.pan.required(),

    aadhaarLast4: Joi.string()
        .pattern(/^\d{4}$/)
        .required()
        .messages({
            'string.pattern.base': 'Aadhaar last 4 digits must be exactly 4 numbers',
        }),
});

// ─── Aadhaar OTP request ───────────────────────────────────────────────────────

export const aadhaarOtpRequestSchema = Joi.object({
    aadhaarNumber: commonSchemas.aadhaar.required(),
});

// ─── Aadhaar OTP verify ────────────────────────────────────────────────────────

// Perfios's aadhaar-verification step requires the OTP sent to the customer's
// Aadhaar-linked mobile during the consent step. This was previously an empty
// schema — the OTP was never collected, validated, or forwarded to Perfios,
// making Aadhaar verification a no-op. Confirmed against real Perfios testing.
export const aadhaarOtpVerifySchema = Joi.object({
    otp: Joi.string().trim().length(6).pattern(/^\d{6}$/).required()
        .messages({ 'string.pattern.base': 'OTP must be a 6-digit number.' }),
});

// ─── Document upload ───────────────────────────────────────────────────────────

export const uploadDocumentSchema = Joi.object({
    documentType: Joi.string()
        .valid('selfie', 'aadhaar_front', 'aadhaar_back', 'pan', 'bank_statement')
        .required(),
});

// ─── Finalise KYC ───────────────────────────────────────────────────────────────
// dob isn't stored anywhere on the KYC record (only PAN/Aadhaar are
// encrypted and persisted) — matches the existing pattern in verify-pan,
// which requires the same field for the same reason.

export const finaliseKycSchema = Joi.object({
    dob: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).required(),
});

// ─── eSign request ─────────────────────────────────────────────────────────────

export const requestESignSchema = Joi.object({
    loanId: Joi.string().uuid({ version: 'uuidv4' }).required(),
});

// ─── Manual override (admin) ───────────────────────────────────────────────────

export const manualOverrideSchema = Joi.object({
    newStatus: Joi.string()
        .valid(KYC_STATUS.COMPLETE, KYC_STATUS.REJECTED)
        .required(),

    reason: Joi.string()
        .trim()
        .min(10)
        .max(500)
        .required()
        .messages({
            'string.min': 'Override reason must be at least 10 characters',
        }),
});

// ─── User ID param ─────────────────────────────────────────────────────────────

export const userIdParamSchema = Joi.object({
    userId: Joi.string().uuid({ version: 'uuidv4' }).required(),
});

export const panVerifySchema = Joi.object({
    fullName: Joi.string().trim().min(2).max(100).required(),
    dob: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).required(),
});

export const bankVerifySchema = Joi.object({
    accountNumber: Joi.string().min(5).max(25).required(),
    ifsc: Joi.string().length(11).required(),
    accountHolder: Joi.string().min(2).max(100).required(),
});

export const bankVerifyAdvancedSchema = Joi.object({
    accountNumber: Joi.string().min(5).max(25).required(),
    ifsc: Joi.string().length(11).required(),
});

export const nameSimilaritySchema = Joi.object({
    name1: Joi.string().min(2).max(100).required(),
    name2: Joi.string().min(2).max(100).required(),
});

export const silentBankVerifySchema = Joi.object({
    accountNumber: Joi.string().min(5).max(25).required(),
    ifsc: Joi.string().length(11).required(),
});

export const gstVerifySchema = Joi.object({
    gstin: Joi.string().length(15).required(),
});