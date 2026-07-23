// src/modules/payments/payments.dto.ts
import Joi from 'joi';

// Field names must exactly match CreateMandateInput (payments.types.ts) and
// what payments.service.ts's createMandate() actually reads. This schema
// previously validated a completely different field set (bankAccountNumber,
// ifscCode, accountHolderName, maxAmount, debitDay) — Joi silently stripped
// every field the service actually needed, so every real call threw at
// runtime with undefined bank details. maxAmount is computed by the service
// itself from the account's EMI, not accepted from the client; debitDay is
// not consumed by this flow at all.
export const createMandateSchema = Joi.object({
    loanAccountId: Joi.string().uuid({ version: 'uuidv4' }).required(),
    customerName:  Joi.string().max(100).required(),
    customerEmail: Joi.string().email().required(),
    customerPhone: Joi.string().min(10).max(15).required(),
    bankAccount:   Joi.string().min(9).max(18).required(),
    ifsc:          Joi.string().length(11).uppercase().required(),
});

export const paymentLinkSchema = Joi.object({
    emiId: Joi.string().uuid({ version: 'uuidv4' }).required(),
    customerName: Joi.string().max(100).required(),
    customerPhone: Joi.string().min(10).max(15).required(),
    expiryMinutes: Joi.number().integer().positive().max(1440).default(60),
});

export const recordCashPaymentSchema = Joi.object({
    loanAccountId: Joi.string().uuid({ version: 'uuidv4' }).required(),
    amount: Joi.number().positive().required(),
    collectedBy: Joi.string().uuid({ version: 'uuidv4' }).required(),
    referenceNumber: Joi.string().max(100).optional(),
    notes: Joi.string().max(500).optional(),
});

export const listPaymentsSchema = Joi.object({
    status: Joi.string()
        .valid('PENDING', 'SUCCESS', 'FAILED', 'REFUNDED')
        .optional(),
    fromDate: Joi.date().iso().optional(),
    toDate: Joi.date().iso().optional(),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(200).default(50),
});

export const loanAccountIdParamSchema = Joi.object({
    loanAccountId: Joi.string().uuid({ version: 'uuidv4' }).required(),
});

export const paymentIdParamSchema = Joi.object({
    paymentId: Joi.string().uuid({ version: 'uuidv4' }).required(),
});
