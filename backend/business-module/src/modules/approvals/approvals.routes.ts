// src/modules/approvals/approvals.routes.ts
import { Router } from 'express';
import Joi from 'joi';
import { approvalsController } from './approvals.controller';
import {
    requireAuth,
    allowRoles,
    validateBody,
    validateQuery,
    validateParams,
} from '@/middlewares';
import { ROLE } from '@/config/constants';

const router = Router();

// Only SUPER_ADMIN can act as checker for now — matches the same
// restriction pattern used by admin.routes.ts for other sensitive actions.
const APPROVAL_CHECKERS = [ROLE.SUPER_ADMIN];

const listQuerySchema = Joi.object({
    status: Joi.string().valid('PENDING', 'APPROVED', 'REJECTED').optional(),
});

const idParamSchema = Joi.object({
    id: Joi.string().uuid({ version: 'uuidv4' }).required(),
});

const approveBodySchema = Joi.object({
    remarks: Joi.string().trim().max(1000).optional(),
});

const rejectBodySchema = Joi.object({
    remarks: Joi.string().trim().min(1).max(1000).required(),
});

router.get(
    '/',
    requireAuth(),
    allowRoles(...APPROVAL_CHECKERS),
    validateQuery(listQuerySchema),
    approvalsController.list,
);

router.post(
    '/:id/approve',
    requireAuth(),
    allowRoles(...APPROVAL_CHECKERS),
    validateParams(idParamSchema),
    validateBody(approveBodySchema),
    approvalsController.approve,
);

router.post(
    '/:id/reject',
    requireAuth(),
    allowRoles(...APPROVAL_CHECKERS),
    validateParams(idParamSchema),
    validateBody(rejectBodySchema),
    approvalsController.reject,
);

export { router as approvalsRouter };