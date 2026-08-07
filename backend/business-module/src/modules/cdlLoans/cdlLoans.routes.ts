// src/modules/cdlLoans/cdlLoans.routes.ts
import { Router } from 'express';
import { cdlLoansController } from './cdlLoans.controller';
import { requireAuth, allowRoles, validateBody, validateParams, validateAll } from '@/middlewares';
import { ROLE } from '@/config/constants';
import {
    cdlSubmitApplicationSchema,
    cdlCreditAssessmentSchema,
    cdlCreditDecisionSchema,
    cdlNachSchema,
    cdlDisburseSchema,
    cdlManualPaymentSchema,
    cdlPaymentFailureSchema,
    cdlIdParamSchema,
} from './cdlLoans.dto';

const router = Router();
const C = ROLE.CUSTOMER;
const F = ROLE.FINANCE;
const A = ROLE.SUPER_ADMIN;

// Most of this module is now wired to real persistence (loan_applications,
// loan_accounts, emi_schedule, disbursements) — same tables/services gold
// loans use. Agreement generation (+ eSign) is real — see
// cdlLoansService.generateAgreement / completeESign, same pdfService +
// docStorage + esign provider pipeline gold loans use. NOC generation is
// real too now — same pdfService + docStorage pipeline, no eSign step —
// see cdlLoansService.generateNoc. Every route below now validates its
// :id param and body via cdlLoans.dto.ts, same pattern loans.routes.ts
// already uses.
//
// POST /loans (activateLoan) removed — activation is automatic now, see
// disburseToMerchant (sync) and disbursement.service.ts's
// _completeDisbursement (async webhook confirmation).
router.post(
    '/applications',
    requireAuth(), allowRoles(C),
    validateBody(cdlSubmitApplicationSchema),
    cdlLoansController.submitApplication,
);
router.post(
    '/applications/:id/kyc',
    requireAuth(), allowRoles(C),
    validateParams(cdlIdParamSchema),
    cdlLoansController.runKycChecks,
);
router.post(
    '/applications/:id/compliance',
    requireAuth(), allowRoles(C),
    validateParams(cdlIdParamSchema),
    cdlLoansController.runComplianceChecks,
);
router.post(
    '/applications/:id/credit-assessment',
    requireAuth(), allowRoles(C),
    ...validateAll({ params: cdlIdParamSchema, body: cdlCreditAssessmentSchema }),
    cdlLoansController.runCreditAssessment,
);
router.post(
    '/applications/:id/credit-decision',
    requireAuth(), allowRoles(C),
    ...validateAll({ params: cdlIdParamSchema, body: cdlCreditDecisionSchema }),
    cdlLoansController.getCreditDecision,
);
router.post(
    '/applications/:id/agreement',
    requireAuth(), allowRoles(C),
    validateParams(cdlIdParamSchema),
    cdlLoansController.generateAgreement,
);
router.post(
    '/applications/:id/esign',
    requireAuth(), allowRoles(C),
    validateParams(cdlIdParamSchema),
    cdlLoansController.completeESign,
);
router.post(
    '/applications/:id/nach',
    requireAuth(), allowRoles(C),
    ...validateAll({ params: cdlIdParamSchema, body: cdlNachSchema }),
    cdlLoansController.registerNachMandate,
);
// disburseToMerchant is real, wired code (real payment provider call, real
// disbursements row) — stubGuard() was blocking it unconditionally (see
// env.ts ENABLE_UNWIRED_LOAN_STUBS fix), which made this endpoint
// unreachable in every environment, not just production.
router.post(
    '/applications/:id/disburse',
    requireAuth(), allowRoles(F, A),
    ...validateAll({ params: cdlIdParamSchema, body: cdlDisburseSchema }),
    cdlLoansController.disburseToMerchant,
);
router.get(
    '/loans/:id/emi-schedule',
    requireAuth(), allowRoles(C),
    validateParams(cdlIdParamSchema),
    cdlLoansController.getEmiSchedule,
);
router.post(
    '/loans/:id/payments',
    requireAuth(), allowRoles(C),
    ...validateAll({ params: cdlIdParamSchema, body: cdlManualPaymentSchema }),
    cdlLoansController.processManualPayment,
);
router.post(
    '/loans/:id/payment-failure',
    requireAuth(), allowRoles(C),
    ...validateAll({ params: cdlIdParamSchema, body: cdlPaymentFailureSchema }),
    cdlLoansController.handlePaymentFailure,
);
router.get(
    '/loans/:id/overdue',
    requireAuth(), allowRoles(C, F),
    validateParams(cdlIdParamSchema),
    cdlLoansController.getOverdueStatus,
);
router.post(
    '/loans/:id/close',
    requireAuth(), allowRoles(C, F),
    validateParams(cdlIdParamSchema),
    cdlLoansController.closeLoan,
);
// generateNoc is real now (pdfService + docStorage, gated on the loan
// actually being CLOSED) — stubGuard() removed, same as disburseToMerchant
// above.
router.post(
    '/loans/:id/noc',
    requireAuth(), allowRoles(C),
    validateParams(cdlIdParamSchema),
    cdlLoansController.generateNoc,
);

export { router as cdlLoansRouter };
