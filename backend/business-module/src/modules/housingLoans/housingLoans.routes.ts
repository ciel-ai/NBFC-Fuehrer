// src/modules/housingLoans/housingLoans.routes.ts
import { Router } from 'express';
import { housingLoansController } from './housingLoans.controller';
import { requireAuth, allowRoles } from '@/middlewares';
import { ROLE } from '@/config/constants';
// stubGuard() no longer used anywhere in this file — every housing-loan
// route is now confirmed wired to real logic (see the per-route comments
// below).

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
// stubGuard() removed: generateAgreement is real, wired code (pdfService +
// docStorage + eSign provider create-sign-request, real loan_applications
// update) — same pattern as CDL's equivalent route.
router.post('/applications/:id/agreement', requireAuth(), allowRoles(CUSTOMER), housingLoansController.generateAgreement);
// stubGuard() removed: eSign() now resolves the applicant's real state
// (customers.state via resolveStateCode()) instead of hardcoding 'KA' — see
// stateCode.util.ts and the fix commit that closed this correctness gap.
router.post('/applications/:id/esign', requireAuth(), allowRoles(CUSTOMER), housingLoansController.eSign);
// stubGuard() removed below: registerNach (real paymentsService/Razorpay
// mandate), applyPmaySubsidy (real loan-amount-driven calculation, no
// external provider), disburseToBuilder (real disbursementService), and the
// EMI-account routes (real emiService/loansRepository/prisma reads+writes) —
// all confirmed wired to real logic, same as CDL's equivalent routes.
router.post('/applications/:id/nach', requireAuth(), allowRoles(CUSTOMER), housingLoansController.registerNach);
router.post('/applications/:id/pmay-subsidy', requireAuth(), allowRoles(CUSTOMER), housingLoansController.applyPmaySubsidy);
router.post('/applications/:id/disburse', requireAuth(), allowRoles(FINANCE, ADMIN), housingLoansController.disburseToBuilder);
router.get('/loans/:id/emi-schedule', requireAuth(), allowRoles(CUSTOMER), housingLoansController.getEmiSchedule);
router.get('/loans/:id/prepayment-quote', requireAuth(), allowRoles(CUSTOMER), housingLoansController.getPrepaymentQuote);
router.post('/loans/:id/prepayment', requireAuth(), allowRoles(CUSTOMER), housingLoansController.processPrepayment);
router.get('/loans/:id/overdue', requireAuth(), allowRoles(CUSTOMER, FINANCE), housingLoansController.getOverdueStatus);
router.post('/loans/:id/close', requireAuth(), allowRoles(CUSTOMER, FINANCE), housingLoansController.closeLoan);
// generateNoc is real, wired code (real pdfService + docStorage calls,
// confirmed while building CDL's equivalent off this function) — stubGuard()
// was blocking it unconditionally, same as CDL's disburseToMerchant
// earlier. NOTE: most of the other routes in this file are ALSO real,
// wired code still sitting behind stubGuard() (generateAgreement, eSign,
// closeLoan, disburseToBuilder, etc.) — this fix covers NOC only; the rest
// need their own dedicated pass, not folded into this one.
router.post('/loans/:id/noc', requireAuth(), allowRoles(CUSTOMER), housingLoansController.generateNoc);

export { router as housingLoansRouter };
