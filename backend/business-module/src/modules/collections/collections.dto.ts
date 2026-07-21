// src/modules/collections/collections.dto.ts
import Joi from 'joi';

// Field names must match LogContactInput (Omit caseId/loggedBy) and what
// collections.controller.ts's logContact reads from the validated body.
// Previously validated 'contactType', but the controller/service read
// 'channel' — Joi silently stripped it, so every call logged a contact
// with channel=undefined.
export const logContactSchema = Joi.object({
    channel: Joi.string()
        .valid('CALL', 'SMS', 'FIELD_VISIT', 'EMAIL', 'WHATSAPP')
        .required(),
    outcome: Joi.string()
        .valid('NO_ANSWER', 'PROMISED_TO_PAY', 'DISPUTE', 'PAID', 'REFUSED', 'NOT_REACHABLE')
        .required(),
    ptpDate: Joi.date().iso().optional(),
    ptpAmount: Joi.number().positive().optional(),
    paymentReceived: Joi.number().positive().optional(),
    notes: Joi.string().max(1000).required(),
});

// Previously validated 'assignedTo', but the controller/service read
// 'assignTo' — case assignment silently no-op'd on every call.
export const assignCaseSchema = Joi.object({
    assignTo: Joi.string().uuid({ version: 'uuidv4' }).required(),
    reason: Joi.string().max(500).optional(),
});

// Schema was missing 'level' entirely — the service's escalation-level
// guard (input.level <= collCase.escalationLevel) always compared against
// undefined, defeating the guard on every call.
export const escalateCaseSchema = Joi.object({
    reason: Joi.string().max(500).required(),
    level: Joi.number().integer().min(1).max(5).required(),
});

// Previously validated 'resolution'/'notes', but the controller/service
// read 'status'/'reason' — every case closure was recorded with status
// and reason both undefined (force-closed with no reason on record).
export const closeCaseSchema = Joi.object({
    status: Joi.string()
        .valid('RESOLVED', 'CLOSED')
        .required(),
    reason: Joi.string().max(500).required(),
});

export const listCasesSchema = Joi.object({
    status: Joi.string()
        .valid('OPEN', 'ESCALATED', 'CLOSED', 'LEGAL')
        .optional(),
    dpdMin: Joi.number().integer().min(0).optional(),
    dpdMax: Joi.number().integer().min(0).optional(),
    assignedTo: Joi.string().uuid({ version: 'uuidv4' }).optional(),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(200).default(50),
});

export const caseIdParamSchema = Joi.object({
    caseId: Joi.string().uuid({ version: 'uuidv4' }).required(),
});

export const loanAccountParamSchema = Joi.object({
    loanAccountId: Joi.string().uuid({ version: 'uuidv4' }).required(),
});
