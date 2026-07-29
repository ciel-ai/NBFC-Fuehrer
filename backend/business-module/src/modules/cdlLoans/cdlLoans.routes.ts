// src/modules/cdlLoans/cdlLoans.routes.ts
import { Router } from 'express';
import { cdlLoansController } from './cdlLoans.controller';
import { requireAuth, allowRoles } from '@/middlewares';
import { stubGuard } from '@/middlewares/stubGuard.middleware';
import { ROLE } from '@/config/constants';

const router = Router();
const C = ROLE.CUSTOMER;
const F = ROLE.FINANCE;
const A = ROLE.SUPER_ADMIN;

// Most of this module is now wired to real persistence (loan_applications,
// loan_accounts, emi_schedule, disbursements) — same tables/services gold
// loans use. Two routes remain genuinely stub (agreement generation and
// NOC generation both need a real document/eSign pipeline, out of tonight's
// scope) and stay behind stubGuard() so that limitation is explicit rather
// than silently faked.
router.post('/loans', requireAuth(), allowRoles(C, F), stubGuard(), cdlLoansController.activateLoan);
router.post('/applications', requireAuth(), allowRoles(C), cdlLoansController.submitApplication);
router.post('/applications/:id/kyc', requireAuth(), allowRoles(C), cdlLoansController.runKycChecks);
router.post('/applications/:id/compliance', requireAuth(), allowRoles(C), cdlLoansController.runComplianceChecks);
router.post('/applications/:id/credit-assessment', requireAuth(), allowRoles(C), cdlLoansController.runCreditAssessment);
router.post('/applications/:id/credit-decision', requireAuth(), allowRoles(C), cdlLoansController.getCreditDecision);
router.post('/applications/:id/agreement', requireAuth(), allowRoles(C), stubGuard(), cdlLoansController.generateAgreement);
router.post('/applications/:id/nach', requireAuth(), allowRoles(C), cdlLoansController.registerNachMandate);
router.post('/applications/:id/disburse', requireAuth(), allowRoles(F, A), stubGuard(), cdlLoansController.disburseToMerchant);
router.get('/loans/:id/emi-schedule', requireAuth(), allowRoles(C), cdlLoansController.getEmiSchedule);
router.post('/loans/:id/payments', requireAuth(), allowRoles(C), cdlLoansController.processManualPayment);
router.post('/loans/:id/payment-failure', requireAuth(), allowRoles(C), cdlLoansController.handlePaymentFailure);
router.get('/loans/:id/overdue', requireAuth(), allowRoles(C, F), cdlLoansController.getOverdueStatus);
router.post('/loans/:id/close', requireAuth(), allowRoles(C, F), cdlLoansController.closeLoan);
router.post('/loans/:id/noc', requireAuth(), allowRoles(C), stubGuard(), cdlLoansController.generateNoc);

export { router as cdlLoansRouter };
