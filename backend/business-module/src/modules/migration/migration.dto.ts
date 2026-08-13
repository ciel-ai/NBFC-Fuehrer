// src/modules/migration/migration.dto.ts
import Joi from 'joi';

export const listBatchesQuerySchema = Joi.object({
    entityType: Joi.string()
        .valid('CUSTOMER', 'LOAN', 'EMI_SCHEDULE', 'PAYMENT', 'MANDATE')
        .optional(),
    status: Joi.string()
        .valid('RUNNING', 'COMPLETED', 'FAILED', 'ROLLED_BACK')
        .optional(),
    limit: Joi.number().integer().positive().max(100).default(20),
    offset: Joi.number().integer().min(0).default(0),
});

export const batchIdParamSchema = Joi.object({
    batchId: Joi.string().uuid({ version: 'uuidv4' }).required(),
});