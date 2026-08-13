// src/modules/sales/sales.dto.ts
//
// The sales wizard files applications on a customer's behalf. Until now this
// module had no validation at all: the route took req.body straight into a
// service that ignored it and returned a fabricated id.
//
// The CDL submit schema below deliberately does NOT restate the CDL business
// rules (amount bounds, the rate table, the productValue/downPayment
// relationship). It validates only what is specific to the sales channel —
// which customer the application is for — and reuses
// cdlSubmitApplicationSchema for the application itself, so the two channels
// cannot drift apart. Everything beyond shape is enforced by
// cdlLoansService.submitApplication, the same code path the customer app uses.

import Joi from 'joi';
import { cdlSubmitApplicationSchema } from '@/modules/cdlLoans/cdlLoans.dto';

// ─── POST /sales/:product/applications ─────────────────────────────────────────

export const salesProductParamSchema = Joi.object({
    product: Joi.string().valid('gold', 'housing', 'cdl').required(),
});

/**
 * The CDL application body, plus the customer it belongs to.
 *
 * `.concat()` rather than a hand-copied field list: adding a field to the CDL
 * contract picks it up here automatically, and a field renamed there cannot
 * silently keep working here.
 */
export const salesCdlSubmitSchema = cdlSubmitApplicationSchema.concat(
    Joi.object({
        /** users.id of the customer. The agent is taken from the JWT. */
        customerId: Joi.string().uuid({ version: 'uuidv4' }).required().messages({
            'any.required': 'Select a customer before submitting',
            'string.guid': 'Customer id must be a valid id',
        }),
    }),
);

// ─── GET /sales/:product/applications ──────────────────────────────────────────

export const salesListQuerySchema = Joi.object({
    status: Joi.string()
        .valid('DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'DISBURSED')
        .optional(),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
});

// ─── GET /sales/customers/search ───────────────────────────────────────────────

export const salesCustomerSearchSchema = Joi.object({
    // Two characters is the shortest query worth hitting the database for;
    // an empty one previously returned the entire fixture list.
    q: Joi.string().trim().min(2).max(100).required().messages({
        'string.min': 'Enter at least 2 characters to search',
        'any.required': 'Enter a name or phone number to search',
    }),
});
