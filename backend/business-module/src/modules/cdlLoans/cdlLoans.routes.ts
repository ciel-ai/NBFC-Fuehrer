// src/modules/cdlLoans/cdlLoans.routes.ts
import { Router } from 'express';
import { cdlLoansController } from './cdlLoans.controller';
import { requireAuth, allowRoles } from '@/middlewares';
import { ROLE } from '@/config/constants';

const router = Router();
const C = ROLE.CUSTOMER;
const F = ROLE.FINANCE;
const A = ROLE.SUPER_ADMIN;

router.post('/loans', requireAuth(), allowRoles(C, F), cdlLoansController.activateLoan);
router.post('/applications', requireAuth(), allowRoles(C), cdlLoansController.submitApplication);
router.post('/applications/:id/kyc', requireAuth(), allowRoles(C), cdlLoansController.runKycChecks);
router.post('/applications/:id/compliance', requireAuth(), allowRoles(C), cdlLoansController.runComplianceChecks);
router.post('/applications/:id/credit-assessment', requireAuth(), allowRoles(C), cdlLoansController.runCreditAssessment);
router.post('/applications/:id/credit-decision', requireAuth(), allowRoles(C), cdlLoansController.getCreditDecision);
router.post('/applications/:id/agreement', requireAuth(), allowRoles(C), cdlLoansController.generateAgreement);
router.post('/applications/:id/nach', requireAuth(), allowRoles(C), cdlLoansController.registerNachMandate);
router.post('/applications/:id/disburse', requireAuth(), allowRoles(F, A), cdlLoansController.disburseToMerchant);
router.get('/loans/:id/emi-schedule', requireAuth(), allowRoles(C), cdlLoansController.getEmiSchedule);
router.post('/loans/:id/payments', requireAuth(), allowRoles(C), cdlLoansController.processManualPayment);
router.post('/loans/:id/payment-failure', requireAuth(), allowRoles(C), cdlLoansController.handlePaymentFailure);
router.get('/loans/:id/overdue', requireAuth(), allowRoles(C, F), cdlLoansController.getOverdueStatus);
router.post('/loans/:id/close', requireAuth(), allowRoles(C, F), cdlLoansController.closeLoan);
router.post('/loans/:id/noc', requireAuth(), allowRoles(C), cdlLoansController.generateNoc);

export { router as cdlLoansRouter };
