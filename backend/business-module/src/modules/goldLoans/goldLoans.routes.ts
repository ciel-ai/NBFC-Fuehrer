// src/modules/goldLoans/goldLoans.routes.ts
import { Router } from 'express';
import { goldLoansController } from './goldLoans.controller';
import { requireAuth, allowRoles } from '@/middlewares';
import { ROLE } from '@/config/constants';
import { stubGuard } from '@/middlewares/stubGuard.middleware';

const router = Router();

// ─── Public routes ────────────────────────────────────────────────────────────

// GET /gold-loans/rate
router.get('/rate', goldLoansController.getRate);

// POST /gold-loans/eligibility
router.post('/eligibility', goldLoansController.calculateEligibility);

// ─── Customer routes ──────────────────────────────────────────────────────────

// GET /gold-loans/branches
router.get(
    '/branches',
    requireAuth(),
    allowRoles(ROLE.CUSTOMER),
    goldLoansController.getNearbyBranches,
);

// POST /gold-loans/appointments
router.post(
    '/appointments',
    requireAuth(),
    allowRoles(ROLE.CUSTOMER),
    goldLoansController.bookAppointment,
);

// GET /gold-loans/appointments/:id
router.get(
    '/appointments/:id',
    requireAuth(),
    allowRoles(ROLE.CUSTOMER, ROLE.OPS_EXECUTIVE, ROLE.CREDIT_MANAGER),
    goldLoansController.getAppointment,
);

// GET /gold-loans/applications/:id/appraisal
router.get(
    '/applications/:id/appraisal',
    requireAuth(),
    allowRoles(ROLE.CUSTOMER, ROLE.CREDIT_MANAGER, ROLE.OPS_EXECUTIVE),
    goldLoansController.getAppraisalResult,
);

// POST /gold-loans/applications/:id/accept-final-amount
// stubGuard() removed: real state-transition + prisma update, no external
// provider involved.
router.post(
    '/applications/:id/accept-final-amount',
    requireAuth(),
    allowRoles(ROLE.CUSTOMER),
    goldLoansController.acceptFinalAmount,
);

// POST /gold-loans/applications/:id/agreement
// stubGuard() removed: real pdfService + docStorage + eSign-provider
// create-sign-request, real loan_applications update — same pattern as
// CDL's equivalent route.
router.post(
    '/applications/:id/agreement',
    requireAuth(),
    allowRoles(ROLE.CUSTOMER),
    goldLoansController.generateAgreement,
);

// POST /gold-loans/applications/:id/esign
// stubGuard() KEPT: completeESign() derives stateCode via
// customer.state.slice(0,2).toUpperCase() with an explicit "Placeholder
// mapping — pending a real state-name-to-code table" comment in the
// service. That crude derivation can produce a wrong 2-letter code for
// many real Indian state names (e.g. state names that don't start with
// their code), which feeds directly into the eStamp provider's stamp-duty
// calculation — a real financial-correctness gap, not cosmetic. Flagged
// in the go-live report instead of unwired.
router.post(
    '/applications/:id/esign',
    requireAuth(),
    allowRoles(ROLE.CUSTOMER),
    stubGuard(),
    goldLoansController.completeESign,
);

// POST /gold-loans/applications/:id/nach
// stubGuard() removed: real paymentsService/Razorpay mandate creation.
router.post(
    '/applications/:id/nach',
    requireAuth(),
    allowRoles(ROLE.CUSTOMER),
    goldLoansController.initiateNach,
);

// GET /gold-loans/applications/:id/disbursal
// stubGuard() removed: real read of disbursementService.getDisbursementByLoan.
router.get(
    '/applications/:id/disbursal',
    requireAuth(),
    allowRoles(ROLE.CUSTOMER, ROLE.FINANCE, ROLE.SUPER_ADMIN),
    goldLoansController.getDisbursalStatus,
);

// POST /gold-loans/applications/:id/compliance
// stubGuard() removed: real KYC-derived AML/compliance read. PEP screening
// is honestly reported as NOT_TRACKED rather than fabricated as passed.
router.post(
    '/applications/:id/compliance',
    requireAuth(),
    allowRoles(ROLE.CUSTOMER),
    goldLoansController.runCompliance,
);

// ─── Branch staff routes ──────────────────────────────────────────────────────

// POST /gold-loans/appointments/:id/arrive
router.post(
    '/appointments/:id/arrive',
    requireAuth(),
    allowRoles(ROLE.OPS_EXECUTIVE, ROLE.SUPER_ADMIN),
    goldLoansController.markArrived,
);

// POST /gold-loans/applications/:id/appraise
router.post(
    '/applications/:id/appraise',
    requireAuth(),
    allowRoles(ROLE.OPS_EXECUTIVE, ROLE.SUPER_ADMIN),
    goldLoansController.submitAppraisal,
);

// ─── Monitoring routes ────────────────────────────────────────────────────────

// GET /gold-loans/:id/monitoring
// stubGuard() removed: real prisma/emiService/collateral_gold reads. Gold
// value shown reflects origination valuation (live market-rate tracking is
// honestly disclosed as unavailable in the response note, not faked).
router.get(
    '/:id/monitoring',
    requireAuth(),
    allowRoles(ROLE.CUSTOMER, ROLE.CREDIT_MANAGER, ROLE.SUPER_ADMIN),
    goldLoansController.getMonitoring,
);

// GET /gold-loans/:id/closure-quote
// stubGuard() removed: real emiService.getForeclosureQuote + collateral_gold
// read (already "wired to real pipeline" per an earlier commit; this route's
// stubGuard() had simply never been removed to match).
router.get(
    '/:id/closure-quote',
    requireAuth(),
    allowRoles(ROLE.CUSTOMER),
    goldLoansController.getClosureQuote,
);

export { router as goldLoansRouter };