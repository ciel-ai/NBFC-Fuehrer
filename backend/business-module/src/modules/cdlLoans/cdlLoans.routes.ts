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

// Every endpoint in this module is stateless mock logic — no DB persistence,
// fabricated reference numbers/UTRs, computed synchronously with no vendor
// or database call at all (confirmed across the audit series). Gated behind
// stubGuard() so nobody can mistake a fake "success" for a real outcome
// until this module gets real persistence wired end-to-end.
router.post('/loans', requireAuth(), allowRoles(C, F), stubGuard(), cdlLoansController.activateLoan);
router.post('/applications', requireAuth(), allowRoles(C), stubGuard(), cdlLoansController.submitApplication);
router.post('/applications/:id/kyc', requireAuth(), allowRoles(C), stubGuard(), cdlLoansController.runKycChecks);
router.post('/applications/:id/compliance', requireAuth(), allowRoles(C), stubGuard(), cdlLoansController.runComplianceChecks);
router.post('/applications/:id/credit-assessment', requireAuth(), allowRoles(C), stubGuard(), cdlLoansController.runCreditAssessment);
router.post('/applications/:id/credit-decision', requireAuth(), allowRoles(C), stubGuard(), cdlLoansController.getCreditDecision);
router.post('/applications/:id/agreement', requireAuth(), allowRoles(C), stubGuard(), cdlLoansController.generateAgreement);
router.post('/applications/:id/nach', requireAuth(), allowRoles(C), stubGuard(), cdlLoansController.registerNachMandate);
router.post('/applications/:id/disburse', requireAuth(), allowRoles(F, A), stubGuard(), cdlLoansController.disburseToMerchant);
router.get('/loans/:id/emi-schedule', requireAuth(), allowRoles(C), stubGuard(), cdlLoansController.getEmiSchedule);
router.post('/loans/:id/payments', requireAuth(), allowRoles(C), stubGuard(), cdlLoansController.processManualPayment);
router.post('/loans/:id/payment-failure', requireAuth(), allowRoles(C), stubGuard(), cdlLoansController.handlePaymentFailure);
router.get('/loans/:id/overdue', requireAuth(), allowRoles(C, F), stubGuard(), cdlLoansController.getOverdueStatus);
router.post('/loans/:id/close', requireAuth(), allowRoles(C, F), stubGuard(), cdlLoansController.closeLoan);
router.post('/loans/:id/noc', requireAuth(), allowRoles(C), stubGuard(), cdlLoansController.generateNoc);

export { router as cdlLoansRouter };
