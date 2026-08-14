// src/modules/migration/migration.schema.ts
import { z } from 'zod';
import {
    isValidPan,
    normalisePan,
    isValidAadhaar,
    normaliseAadhaar,
    isValidPhone,
    normalisePhoneForMigration,
    coerceDate,
    coerceAmount,
} from './migration.validator';

// ─── Shared coercion helpers ──────────────────────────────────────────────────

const zodCoercedDate = z.unknown().transform((val, ctx) => {
    const d = coerceDate(val);
    if (!d) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: `Invalid date: ${String(val)}` });
        return z.NEVER;
    }
    return d;
});

const zodCoercedAmount = z.unknown().transform((val, ctx) => {
    const n = coerceAmount(val);
    if (n === null) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: `Invalid amount: ${String(val)}` });
        return z.NEVER;
    }
    return n;
});

// ─── Borrower row ─────────────────────────────────────────────────────────────
// One row from the client Excel = one borrower (users + customers record).

export const BorrowerRowSchema = z.object({
    legacyId: z.string().trim().min(1, 'legacyId is required'),

    fullName: z.string().trim().min(1, 'fullName is required').max(100),

    phone: z.string().transform((val, ctx) => {
        if (!isValidPhone(val)) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, message: `Invalid phone: ${val}` });
            return z.NEVER;
        }
        return normalisePhoneForMigration(val) ?? val;
    }),

    email: z.preprocess(
        (val) => (val === '' || val === null ? undefined : val),
        z.string().trim().email('Invalid email').max(255).optional(),
    ),

    pan: z.string().transform((val, ctx) => {
        const n = normalisePan(val);
        if (!isValidPan(n)) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, message: `Invalid PAN: ${val}` });
            return z.NEVER;
        }
        return n;
    }),

    aadhaar: z.string().transform((val, ctx) => {
        const n = normaliseAadhaar(val);
        if (!isValidAadhaar(n)) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, message: `Invalid Aadhaar: ${val}` });
            return z.NEVER;
        }
        return n;
    }),

    dob: zodCoercedDate,

    flatHouseNo:    z.string().trim().max(100).optional(),
    streetArea:     z.string().trim().max(200).optional(),
    city:           z.string().trim().max(100).optional(),
    state:          z.string().trim().max(100).optional(),
    pincode:        z.string().trim().regex(/^\d{6}$/, 'Pincode must be exactly 6 digits').optional(),

    employmentType: z.enum(['SALARIED', 'SELF_EMPLOYED', 'BUSINESS', 'RETIRED', 'STUDENT', 'OTHER']).optional(),
    employerName:   z.string().trim().max(200).optional(),
});

export type BorrowerRow = z.infer<typeof BorrowerRowSchema>;

// ─── Loan row ─────────────────────────────────────────────────────────────────
// One row = one loan account (loan_applications + loan_accounts record).

export const LoanRowSchema = z.object({
    legacyId:         z.string().trim().min(1, 'Loan legacyId is required'),
    borrowerLegacyId: z.string().trim().min(1, 'borrowerLegacyId is required'),
    accountNumber:    z.string().trim().min(1).max(20),

    productType: z.enum([
        'CONSUMER_DURABLE',
        'TWO_WHEELER',
        'EDUCATION_DEVICE',
        'GOLD_LOAN',
        'HOUSING_LOAN',
    ]),

    principalAmount:    zodCoercedAmount,
    interestRate:       zodCoercedAmount,
    tenureMonths:       z.coerce.number().int().positive(),
    monthlyEmi:         zodCoercedAmount,
    outstandingBalance: zodCoercedAmount,

    disbursedAt: zodCoercedDate,

    status: z.enum(['ACTIVE', 'CLOSED', 'NPA', 'WRITTEN_OFF']),

    razorpayMandateId: z.string().trim().max(100).optional(),
});

export type LoanRow = z.infer<typeof LoanRowSchema>;