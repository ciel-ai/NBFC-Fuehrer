// src/modules/reconciliation/reconciliation.routes.ts
import { Router } from 'express';
import Joi from 'joi';
import { reconciliationController } from './reconciliation.controller';
import {
    requireAuth,
    allowRoles,
    validateQuery,
    validateParams,
} from '@/middlewares';
import { ROLE } from '@/config/constants';

const router = Router();

const RECONCILIATION_VIEWERS = [ROLE.FINANCE, ROLE.SUPER_ADMIN];

const listQuerySchema = Joi.object({
    reportType: Joi.string().valid('EMI_COLLECTION', 'PAYMENT_GATEWAY').optional(),
    fromDate:   Joi.date().iso().optional(),
    toDate:     Joi.date().iso().optional(),
    page:       Joi.number().integer().min(1).default(1),
    limit:      Joi.number().integer().min(1).max(100).default(20),
});

const reportIdParamSchema = Joi.object({
    id: Joi.string().uuid({ version: 'uuidv4' }).required(),
});

// ── List reconciliation reports ─────────────────────────────────────────────
router.get(
    '/reports',
    requireAuth(),
    allowRoles(...RECONCILIATION_VIEWERS),
    validateQuery(listQuerySchema),
    reconciliationController.listReports,
);

// ── Get a single reconciliation report ──────────────────────────────────────
router.get(
    '/reports/:id',
    requireAuth(),
    allowRoles(...RECONCILIATION_VIEWERS),
    validateParams(reportIdParamSchema),
    reconciliationController.getReport,
);

export { router as reconciliationRouter };