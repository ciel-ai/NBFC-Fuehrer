// src/modules/cdlLoans/cdlLoans.dto.ts
//
// Every CDL endpoint previously trusted whatever the app sent it — no
// check that loanAmount was even a number, that productCategory was a
// real category, etc. Same pattern the generic `loans` module already
// uses (loans.dto.ts): Joi schemas here, wired via validateBody/
// validateParams in cdlLoans.routes.ts, read back via getValidatedBody/
// getValidatedParams in cdlLoans.controller.ts.
//
// Field names in every schema below were cross-checked against exactly
// what cdlLoans.controller.ts destructures from req.body and what
// cdlLoans.service.ts actually reads — payments.dto.ts has a documented
// case (see its own top comment) of a schema that validated a
// completely different field set than the service used, silently
// stripping every field the service actually needed (stripUnknown:
// true is the default). Don't repeat that here.
//
// Precise CDL business-rule bounds (loan amount, tenure, auto-debit
// dates) are imported from cdlLoans.service.ts rather than duplicated as
// literal numbers, so the two can't drift out of sync. Joi's job here is
// catching malformed/missing/wrong-type input before it reaches the
// service at all — the service still owns the exact per-employment-type
// interest rate table and other business logic that doesn't belong in a
// shape-validation layer.

import Joi from 'joi';
import { commonSchemas } from '@/middlewares';
import {
    CDL_MIN_LOAN_AMOUNT,
    CDL_MAX_LOAN_AMOUNT,
    CDL_MIN_TENURE_MONTHS,
    CDL_MAX_TENURE_MONTHS,
    CDL_AUTO_DEBIT_DATES,
    CDL_INTEREST_RATES,
} from './cdlLoans.service';

// All interest rates that are valid for AT LEAST one employment type —
// a loose sanity check here; the service still enforces the exact
// per-employment-type table (e.g. 15% is invalid for SALARIED even
// though it's in this combined list) with its own clear error message.
const ANY_VALID_INTEREST_RATE = [
    ...new Set(Object.values(CDL_INTEREST_RATES).flat()),
];

// ─── POST /consumer-durable-loans/applications ─────────────────────────────────

export const cdlSubmitApplicationSchema = Joi.object({
    // Must match CdlApplicationInput['productCategory'] (cdlLoans.types.ts)
    productCategory: Joi.string()
        .valid('TV_APPLIANCES', 'MOBILES_TABLETS', 'LAPTOPS', 'FURNITURE', 'AC', 'OTHERS')
        .required(),

    productName: Joi.string().trim().min(2).max(200).required(),

    productPrice: commonSchemas.amount.required(),

    downPayment: Joi.number().min(0).precision(2).required(),

    loanAmount: commonSchemas.amount
        .min(CDL_MIN_LOAN_AMOUNT)
        .max(CDL_MAX_LOAN_AMOUNT)
        .required()
        .messages({
            'number.min': `Loan amount must be at least ₹${CDL_MIN_LOAN_AMOUNT.toLocaleString('en-IN')}`,
            'number.max': `Loan amount cannot exceed ₹${CDL_MAX_LOAN_AMOUNT.toLocaleString('en-IN')}`,
        }),

    tenureMonths: Joi.number()
        .integer()
        .min(CDL_MIN_TENURE_MONTHS)
        .max(CDL_MAX_TENURE_MONTHS)
        .required()
        .messages({
            'number.min': `Minimum tenure is ${CDL_MIN_TENURE_MONTHS} months`,
            'number.max': `Maximum tenure is ${CDL_MAX_TENURE_MONTHS} months`,
        }),

    storeName: Joi.string().trim().min(2).max(100).required(),
    storeCity: Joi.string().trim().min(2).max(100).required(),

    // Must match CdlApplicationInput['employmentType']
    employmentType: Joi.string()
        .valid('SALARIED', 'SELF_EMPLOYED', 'STUDENT')
        .required(),

    monthlyIncome: Joi.number().positive().precision(2).required(),

    // Exact per-employment-type validity is enforced by
    // getCdlInterestRate() in the service — this just rejects obviously
    // wrong values (a string, a negative number, a rate no employment
    // type ever allows) before they get that far.
    interestRatePct: Joi.number()
        .valid(...ANY_VALID_INTEREST_RATE)
        .optional(),

    autoDebitDate: Joi.number()
        .valid(...CDL_AUTO_DEBIT_DATES)
        .optional(),
});

// ─── POST /applications/:id/credit-assessment ──────────────────────────────────
// Body fields match CdlCreditAssessmentInput exactly — all three are read
// by cdlLoansService.runCreditAssessment. cibilScore is deliberately NOT
// part of this schema — it's read server-side from kyc_documents
// .credit_score (the real bureau-verified score), never from the client.
// Previously accepted a client-supplied cibilScore (300-900) and trusted
// it outright for the actual credit decision.

export const cdlCreditAssessmentSchema = Joi.object({
    monthlyIncome: Joi.number().positive().precision(2).required(),
    existingEmis: Joi.number().min(0).precision(2).required(),
    proposedEmi: Joi.number().positive().precision(2).required(),
});

// ─── POST /applications/:id/credit-decision ────────────────────────────────────
// Previously accepted a client-echoed creditStatus/maxLoanAmount and wrote
// those trusted values directly to the DB as the approval decision — a
// customer could call this endpoint directly with {creditStatus:'PASS',
// maxLoanAmount:100000} and self-approve their own loan, skipping
// /credit-assessment entirely. getCreditDecision now computes the
// decision itself (same server-derived cibilScore as /credit-assessment),
// so the only trusted client input is the same income data
// /credit-assessment already takes — deliberately identical shape to
// cdlCreditAssessmentSchema, kept as a separate named export since it
// documents a distinct route/intent.

export const cdlCreditDecisionSchema = Joi.object({
    monthlyIncome: Joi.number().positive().precision(2).required(),
    existingEmis: Joi.number().min(0).precision(2).required(),
    proposedEmi: Joi.number().positive().precision(2).required(),
});

// ─── POST /applications/:id/nach ────────────────────────────────────────────────
// Field names/format match createMandateSchema in payments.dto.ts.

export const cdlNachSchema = Joi.object({
    bankAccount: Joi.string().min(9).max(18).required(),
    ifsc: Joi.string().length(11).uppercase().required(),
});

// ─── POST /applications/:id/disburse ───────────────────────────────────────────
// initiatedBy is NOT part of this schema — cdlLoans.controller.ts sets it
// from req.user, never from the client body.

export const cdlDisburseSchema = Joi.object({
    merchantName: Joi.string().trim().min(2).max(200).required(),
    amount: commonSchemas.amount.required(),
});

// ─── POST /loans/:id/payments ──────────────────────────────────────────────────

export const cdlManualPaymentSchema = Joi.object({
    emiId: Joi.string().uuid({ version: 'uuidv4' }).required(),
    amount: commonSchemas.amount.required(),
    collectionId: Joi.string().max(100).optional(),
});

// ─── POST /loans/:id/payment-failure ───────────────────────────────────────────

export const cdlPaymentFailureSchema = Joi.object({
    emiId: Joi.string().uuid({ version: 'uuidv4' }).required(),
});

// ─── POST /loans/:id/part-payment (audit finding #15) ──────────────────────────
// No emiId — unlike cdlManualPaymentSchema, this is a lump sum the service
// itself allocates across whichever EMIs are actually due, oldest first.

export const cdlPartPaymentSchema = Joi.object({
    amount: commonSchemas.amount.required(),
    collectionId: Joi.string().max(100).optional(),
});

// ─── :id param — used on every /applications/:id/* and /loans/:id/* route ─────
// Same shape as commonSchemas.uuidParam; a named export here so
// cdlLoans.routes.ts's intent is explicit at each call site.

export const cdlIdParamSchema = commonSchemas.uuidParam;
