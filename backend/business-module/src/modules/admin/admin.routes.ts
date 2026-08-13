// src/modules/admin/admin.routes.ts
import { Router } from 'express';
import Joi from 'joi';
import { adminController } from './admin.controller';
import { migrationRouter } from '@/modules/migration';
import {
    requireAuth,
    allowRoles,
    validateBody,
    validateParams,
    validateQuery,
} from '@/middlewares';
import {
    createAdminUserSchema,
    updateAdminUserSchema,
    updateConfigSchema,
    listAdminUsersSchema,
    adminUserIdParamSchema,
    configKeyParamSchema,
} from './admin.dto';
import { ROLE } from '@/config/constants';

const router = Router();

// All admin routes require SUPER_ADMIN
const SUPER_ADMIN_ONLY = [ROLE.SUPER_ADMIN];

// ─── Admin auth ───────────────────────────────────────────────────────────────
// The ad-hoc /auth/login and /auth/me routes that used to live here have been
// removed. They minted JWTs with no `jti` (so staffAuth.service.logout's
// denylist could never revoke them), used a 12-hour TTL instead of the
// 15-minute standard, and checked `is_active` — a field staff deactivation
// never actually writes to (it writes `status` instead) — so a deactivated
// admin could keep authenticating through this path indefinitely.
// All admin/staff auth now goes exclusively through staffAuth.routes.ts
// (/staff/auth/login), which the actual frontend (Login.tsx, authStore.ts)
// already exclusively uses — this ad-hoc path had zero real callers.

// ─── Dashboard ────────────────────────────────────────────────────────────────
router.get(
    '/dashboard',
    requireAuth(),
    allowRoles(...SUPER_ADMIN_ONLY),
    adminController.dashboard,
);

// ─── Admin user management ────────────────────────────────────────────────────

router.get(
    '/users',
    requireAuth(),
    allowRoles(...SUPER_ADMIN_ONLY),
    validateQuery(listAdminUsersSchema),
    adminController.listUsers,
);

router.get(
    '/users/:userId',
    requireAuth(),
    allowRoles(...SUPER_ADMIN_ONLY),
    validateParams(adminUserIdParamSchema),
    adminController.getUser,
);

router.post(
    '/users',
    requireAuth(),
    allowRoles(...SUPER_ADMIN_ONLY),
    validateBody(createAdminUserSchema),
    adminController.createUser,
);

router.patch(
    '/users/:userId',
    requireAuth(),
    allowRoles(...SUPER_ADMIN_ONLY),
    validateParams(adminUserIdParamSchema),
    validateBody(updateAdminUserSchema),
    adminController.updateUser,
);

// ─── System configuration ─────────────────────────────────────────────────────

router.get(
    '/config',
    requireAuth(),
    allowRoles(...SUPER_ADMIN_ONLY),
    adminController.listConfigs,
);

router.get(
    '/config/:key',
    requireAuth(),
    allowRoles(...SUPER_ADMIN_ONLY),
    validateParams(configKeyParamSchema),
    adminController.getConfig,
);

router.put(
    '/config/:key',
    requireAuth(),
    allowRoles(...SUPER_ADMIN_ONLY),
    validateParams(configKeyParamSchema),
    validateBody(updateConfigSchema),
    adminController.updateConfig,
);

// ─── Maintenance mode ─────────────────────────────────────────────────────────

router.post(
    '/maintenance',
    requireAuth(),
    allowRoles(...SUPER_ADMIN_ONLY),
    validateBody(Joi.object({
        enabled: Joi.boolean().required(),
        message: Joi.string().trim().max(500).when('enabled', {
            is: true,
            then: Joi.required(),
        }),
    })),
    adminController.setMaintenance,
);

router.get('/branches', requireAuth(), allowRoles(...SUPER_ADMIN_ONLY), adminController.listBranches);
router.post('/branches', requireAuth(), allowRoles(...SUPER_ADMIN_ONLY), validateBody(Joi.object({ name: Joi.string().required(), address: Joi.string().required(), city: Joi.string().required(), state: Joi.string().required(), pincode: Joi.string().required(), phone: Joi.string().optional() })), adminController.createBranch);
router.patch(
    '/branches/:branchId',
    requireAuth(),
    allowRoles(...SUPER_ADMIN_ONLY),
    validateParams(Joi.object({
        branchId: Joi.string().uuid({ version: 'uuidv4' }).required(),
    })),
    validateBody(Joi.object({
        name: Joi.string().max(100).optional(),
        address: Joi.string().max(300).optional(),
        city: Joi.string().max(50).optional(),
        state: Joi.string().max(50).optional(),
        pincode: Joi.string().max(10).optional(),
        phone: Joi.string().max(15).optional(),
        manager_id: Joi.string().uuid({ version: 'uuidv4' }).allow(null).optional(),
        lat: Joi.number().optional(),
        lng: Joi.number().optional(),
        working_hours: Joi.string().max(100).optional(),
        is_active: Joi.boolean().optional(),
    })),
    adminController.updateBranch,
);
// Previously had zero query validation at all — status accepted any string
// value, and limit had no upper bound, letting a caller request an
// arbitrarily large page size (e.g. limit=999999) for a full-table dump.
router.get(
    '/loans',
    requireAuth(),
    allowRoles(...SUPER_ADMIN_ONLY),
    validateQuery(Joi.object({
        productType: Joi.string().valid('CONSUMER_DURABLE', 'TWO_WHEELER', 'EDUCATION_DEVICE', 'GOLD_LOAN', 'HOUSING_LOAN').optional(),
        status: Joi.string().valid(
            'DRAFT', 'KYC_PENDING', 'KYC_REJECTED', 'UNDERWRITING', 'APPOINTMENT_BOOKED',
            'APPRAISAL_PENDING', 'PROPERTY_ASSESSMENT', 'PENDING_APPROVAL', 'APPROVED',
            'REJECTED', 'ESIGN_PENDING', 'DISBURSED', 'ACTIVE', 'CLOSED', 'NPA', 'WRITTEN_OFF',
        ).optional(),
        search: Joi.string().max(100).optional(),
        page: Joi.number().integer().positive().default(1),
        limit: Joi.number().integer().positive().max(100).default(20),
    })),
    adminController.listAllLoans,
);
router.get('/loans/:loanId', requireAuth(), allowRoles(...SUPER_ADMIN_ONLY), adminController.getLoanDetail);
router.patch(
    '/customers/:userId/status',
    requireAuth(),
    allowRoles(...SUPER_ADMIN_ONLY),
    validateBody(Joi.object({ isActive: Joi.boolean().required() })),
    adminController.setCustomerActiveStatus,
);

// ─── Data migration monitoring ────────────────────────────────────────────────
router.use('/migration', requireAuth(), allowRoles(...SUPER_ADMIN_ONLY), migrationRouter);

export { router as adminRouter };
