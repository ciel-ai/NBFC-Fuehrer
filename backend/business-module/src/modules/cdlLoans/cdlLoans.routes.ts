// src/modules/cdlLoans/cdlLoans.routes.ts
import { Router } from 'express';
import { cdlLoansController } from './cdlLoans.controller';
import { requireAuth, allowRoles, validateBody, validateParams, validateAll } from '@/middlewares';
import { idempotency } from '@/middlewares/idempotency.middleware';
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
// idempotency() (audit finding #10) — every state-changing route below
// now carries it, same requireAuth()/allowRoles()/idempotency()/
// validate* ordering disbursement.routes.ts and payments.routes.ts
// already use. It's opt-in per request (a no-op unless the client sends
// an Idempotency-Key header), so this is non-breaking for any client
// that doesn't send one yet. GET routes (emi-schedule, overdue) don't
// get it — reads have nothing to deduplicate.
//
// POST /loans (activateLoan) removed — activation is automatic now, see
// disburseToMerchant (sync) and disbursement.service.ts's
// _completeDisbursement (async webhook confirmation).
router.post(
    '/applications',
    requireAuth(), allowRoles(C),
    idempotency(),
    validateBody(cdlSubmitApplicationSchema),
    cdlLoansController.submitApplication,
);
router.post(
    '/applications/:id/kyc',
    requireAuth(), allowRoles(C),
    idempotency(),
    validateParams(cdlIdParamSchema),
    cdlLoansController.runKycChecks,
);
router.post(
    '/applications/:id/compliance',
    requireAuth(), allowRoles(C),
    idempotency(),
    validateParams(cdlIdParamSchema),
    cdlLoansController.runComplianceChecks,
);
router.post(
    '/applications/:id/credit-assessment',
    requireAuth(), allowRoles(C),
    idempotency(),
    ...validateAll({ params: cdlIdParamSchema, body: cdlCreditAssessmentSchema }),
    cdlLoansController.runCreditAssessment,
);
router.post(
    '/applications/:id/credit-decision',
    requireAuth(), allowRoles(C),
    idempotency(),
    ...validateAll({ params: cdlIdParamSchema, body: cdlCreditDecisionSchema }),
    cdlLoansController.getCreditDecision,
);
// generateAgreement already has its own purpose-built re-entrancy guard
// (checks esign_status: returns the existing signed doc if already
// SIGNED, rejects if a request is still PENDING, allows retry after
// FAILED/EXPIRED/CANCELLED — see cdlLoansService.generateAgreement). That
// guard is DB-state-based (check-then-act against the current row) and
// closes the SEQUENTIAL re-call case — but it cannot close a genuine
// CONCURRENT race: two simultaneous requests can both read
// esign_status as not-yet-set before either has written anything, both
// pass the guard, and both proceed to call the real PDF generator and
// eSign provider. idempotency() reserves the key atomically (a DB
// unique-constraint insert) before either request does any real work, so
// the second concurrent request gets 409 immediately — a gap the
// state-based guard structurally can't cover on its own. Added here too,
// not redundant with the earlier fix — the two protect different windows
// (concurrent vs. sequential re-entry).
router.post(
    '/applications/:id/agreement',
    requireAuth(), allowRoles(C),
    idempotency(),
    validateParams(cdlIdParamSchema),
    cdlLoansController.generateAgreement,
);
router.post(
    '/applications/:id/esign',
    requireAuth(), allowRoles(C),
    idempotency(),
    validateParams(cdlIdParamSchema),
    cdlLoansController.completeESign,
);
router.post(
    '/applications/:id/nach',
    requireAuth(), allowRoles(C),
    idempotency(),
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
    idempotency(),
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
    idempotency(),
    ...validateAll({ params: cdlIdParamSchema, body: cdlManualPaymentSchema }),
    cdlLoansController.processManualPayment,
);
router.post(
    '/loans/:id/payment-failure',
    requireAuth(), allowRoles(C),
    idempotency(),
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
    idempotency(),
    validateParams(cdlIdParamSchema),
    cdlLoansController.closeLoan,
);
// generateNoc is real now (pdfService + docStorage, gated on the loan
// actually being CLOSED) — stubGuard() removed, same as disburseToMerchant
// above.
router.post(
    '/loans/:id/noc',
    requireAuth(), allowRoles(C),
    idempotency(),
    validateParams(cdlIdParamSchema),
    cdlLoansController.generateNoc,
);

// On-demand document endpoints (audit finding #14) — pdfService already
// had real generateLoanStatement/generateRepaymentSchedule/
// generateInterestCertificate functions, already used by other loan
// products, that CDL never called. Same GET pattern as
// getEmiSchedule/getOverdueStatus above: requireAuth, allowRoles(C),
// account-ownership check inside the service, no idempotency() — these
// are reads, nothing to deduplicate. Each regenerates the document fresh
// on every call rather than caching (a statement/schedule can go stale
// as EMIs get paid, and this module has no document-versioning story).
router.get(
    '/loans/:id/statement',
    requireAuth(), allowRoles(C),
    validateParams(cdlIdParamSchema),
    cdlLoansController.getLoanStatement,
);
router.get(
    '/loans/:id/repayment-schedule',
    requireAuth(), allowRoles(C),
    validateParams(cdlIdParamSchema),
    cdlLoansController.getRepaymentSchedule,
);
// financialYear is an optional ?financialYear=2025-26 query param —
// pdfService.generateInterestCertificate requires one, and interest
// certificates are typically needed for a specific past tax year, not
// just "now"; defaults to the current Indian financial year (April-
// March) inside the service when omitted.
router.get(
    '/loans/:id/interest-certificate',
    requireAuth(), allowRoles(C),
    validateParams(cdlIdParamSchema),
    cdlLoansController.getInterestCertificate,
);

export { router as cdlLoansRouter };
