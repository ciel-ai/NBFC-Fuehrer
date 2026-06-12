// src/modules/goldLoans/goldLoans.routes.ts
import { Router } from 'express';
import { goldLoansController } from './goldLoans.controller';
import { requireAuth, allowRoles } from '@/middlewares';
import { ROLE } from '@/config/constants';

const router = Router();

// ─── Public routes (no auth needed) ──────────────────────────────────────────

// GET /gold-loans/rate
router.get('/rate', goldLoansController.getRate);

// POST /gold-loans/eligibility
router.post('/eligibility', goldLoansController.calculateEligibility);

// GET /gold-loans/branches/nearby
router.get(
    '/branches/nearby',
    requireAuth(),
    allowRoles(ROLE.CUSTOMER),
    goldLoansController.getNearbyBranches,
);

// ─── Customer routes ──────────────────────────────────────────────────────────

// POST /gold-loans/appointments
router.post(
    '/appointments',
    requireAuth(),
    allowRoles(ROLE.CUSTOMER),
    goldLoansController.bookAppointment,
);

// POST /gold-loans/applications/:id/compliance
router.post(
    '/applications/:id/compliance',
    requireAuth(),
    allowRoles(ROLE.CUSTOMER),
    goldLoansController.runCompliance,
);

// GET /gold-loans/applications/:id/appraisal
router.get(
    '/applications/:id/appraisal',
    requireAuth(),
    allowRoles(ROLE.CUSTOMER, ROLE.CREDIT_MANAGER, ROLE.OPS_EXECUTIVE),
    goldLoansController.getAppraisalResult,
);

// POST /gold-loans/applications/:id/accept-final-amount
router.post(
    '/applications/:id/accept-final-amount',
    requireAuth(),
    allowRoles(ROLE.CUSTOMER),
    goldLoansController.acceptFinalAmount,
);

// POST /gold-loans/applications/:id/agreement
router.post(
    '/applications/:id/agreement',
    requireAuth(),
    allowRoles(ROLE.CUSTOMER),
    goldLoansController.generateAgreement,
);

// POST /gold-loans/applications/:id/esign
router.post(
    '/applications/:id/esign',
    requireAuth(),
    allowRoles(ROLE.CUSTOMER),
    goldLoansController.completeESign,
);

// POST /gold-loans/applications/:id/nach
router.post(
    '/applications/:id/nach',
    requireAuth(),
    allowRoles(ROLE.CUSTOMER),
    goldLoansController.initiateNach,
);

// GET /gold-loans/applications/:id/disbursal
router.get(
    '/applications/:id/disbursal',
    requireAuth(),
    allowRoles(ROLE.CUSTOMER, ROLE.FINANCE, ROLE.SUPER_ADMIN),
    goldLoansController.getDisbursalStatus,
);

// GET /gold-loans/:id/monitoring
router.get(
    '/:id/monitoring',
    requireAuth(),
    allowRoles(ROLE.CUSTOMER, ROLE.CREDIT_MANAGER, ROLE.SUPER_ADMIN),
    goldLoansController.getMonitoring,
);

// GET /gold-loans/:id/closure-quote
router.get(
    '/:id/closure-quote',
    requireAuth(),
    allowRoles(ROLE.CUSTOMER),
    goldLoansController.getClosureQuote,
);

export { router as goldLoansRouter };