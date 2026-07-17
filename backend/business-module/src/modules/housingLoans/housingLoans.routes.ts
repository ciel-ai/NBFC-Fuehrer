// src/modules/housingLoans/housingLoans.routes.ts
import { Router } from 'express';
import { housingLoansController } from './housingLoans.controller';
import { requireAuth, allowRoles } from '@/middlewares';
import { ROLE } from '@/config/constants';
import { stubGuard } from '@/middlewares/stubGuard.middleware';

const router = Router();
const CUSTOMER = ROLE.CUSTOMER;
const CREDIT = ROLE.CREDIT_MANAGER;
const FINANCE = ROLE.FINANCE;
const ADMIN = ROLE.SUPER_ADMIN;

router.post('/loans', requireAuth(), allowRoles(CUSTOMER, FINANCE, ADMIN), housingLoansController.activateLoan);
router.post('/applications', requireAuth(), allowRoles(CUSTOMER), housingLoansController.submitApplication);
router.post('/applications/:id/kyc', requireAuth(), allowRoles(CUSTOMER), housingLoansController.runKyc);
router.post('/applications/:id/compliance', requireAuth(), allowRoles(CUSTOMER), housingLoansController.runCompliance);
router.post('/applications/:id/income-assessment', requireAuth(), allowRoles(CUSTOMER), housingLoansController.runIncomeAssessment);
router.post('/applications/:id/credit-assessment', requireAuth(), allowRoles(CUSTOMER, CREDIT), housingLoansController.runCreditAssessment);
router.post('/applications/:id/property-assessment', requireAuth(), allowRoles(CUSTOMER, CREDIT), housingLoansController.runPropertyAssessment);
router.post('/applications/:id/submit-review', requireAuth(), allowRoles(CUSTOMER), housingLoansController.submitForReview);
router.get('/applications/:id/decision', requireAuth(), allowRoles(CUSTOMER, CREDIT), housingLoansController.getCommitteeDecision);
router.post('/applications/:id/agreement', requireAuth(), allowRoles(CUSTOMER), stubGuard(), housingLoansController.generateAgreement);
router.post('/applications/:id/esign', requireAuth(), allowRoles(CUSTOMER), stubGuard(), housingLoansController.eSign);
router.post('/applications/:id/nach', requireAuth(), allowRoles(CUSTOMER), stubGuard(), housingLoansController.registerNach);
router.post('/applications/:id/pmay-subsidy', requireAuth(), allowRoles(CUSTOMER), stubGuard(), housingLoansController.applyPmaySubsidy);
router.post('/applications/:id/disburse', requireAuth(), allowRoles(FINANCE, ADMIN), stubGuard(), housingLoansController.disburseToBuilder);
router.get('/loans/:id/emi-schedule', requireAuth(), allowRoles(CUSTOMER), stubGuard(), housingLoansController.getEmiSchedule);
router.get('/loans/:id/prepayment-quote', requireAuth(), allowRoles(CUSTOMER), stubGuard(), housingLoansController.getPrepaymentQuote);
router.post('/loans/:id/prepayment', requireAuth(), allowRoles(CUSTOMER), stubGuard(), housingLoansController.processPrepayment);
router.get('/loans/:id/overdue', requireAuth(), allowRoles(CUSTOMER, FINANCE), stubGuard(), housingLoansController.getOverdueStatus);
router.post('/loans/:id/close', requireAuth(), allowRoles(CUSTOMER, FINANCE), stubGuard(), housingLoansController.closeLoan);
router.post('/loans/:id/noc', requireAuth(), allowRoles(CUSTOMER), stubGuard(), housingLoansController.generateNoc);

export { router as housingLoansRouter };
