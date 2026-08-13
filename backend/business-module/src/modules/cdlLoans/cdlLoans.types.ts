// src/modules/cdlLoans/cdlLoans.types.ts
//
// ─── CANONICAL CDL CONTRACT ───────────────────────────────────────────────────
//
// This file is the single source of truth for CDL field names. The mobile app's
// mirror of these types lives at
// frontend/mobile/src/entities/consumerDurableLoan.ts and must match it field
// for field; tests/unit/cdlLoans.contract.test.ts pins the request shapes so
// the two cannot drift apart silently again.
//
// Naming rules, and why each canonical name won:
//
//   loanAmount        the principal. Not `amount` (the mobile app's old name,
//                     too generic to distinguish from productValue/downPayment/
//                     approvedAmount) and not `amountRequested` (the shared
//                     repository/DB name, which gold and housing also use —
//                     see the mapping note below).
//   tenureMonths      not `tenure`; the unit belongs in the name.
//   productValue      the item's invoice value. Was `productPrice` here and
//                     `productValue` in the mobile app and the sales wizard;
//                     the majority name also reads as the business fact.
//                     productValue - downPayment = loanAmount.
//   interestRate      not `interestRatePct`. Matches the DB column
//                     (interest_rate) and every other module's field name.
//   preferredDebitDay not `autoDebitDate`. It is a day-of-month (4|7|12), not
//                     a date, and preferred_debit_day is what the column is
//                     already called.
//   existingEmis      the applicant's existing monthly EMI obligations. Not
//                     `existingObligations` (the mobile app's old name).
//
// Application-level names are camelCase and map to snake_case columns in the
// repository layer only (loanAmount → amount_requested, productValue →
// product_value). That mapping is deliberate: the columns are shared with gold
// and housing applications and renaming them would break both products.

export interface CdlApplicationInput {
    productCategory: 'TV_APPLIANCES' | 'MOBILES_TABLETS' | 'LAPTOPS' | 'FURNITURE' | 'AC' | 'OTHERS';
    productName: string;
    /** Invoice value of the item financed. Not the principal — see header. */
    productValue: number;
    downPayment: number;
    loanAmount: number;
    tenureMonths: number;
    storeName: string;
    storeCity: string;
    employmentType: 'SALARIED' | 'SELF_EMPLOYED' | 'STUDENT';
    monthlyIncome: number;
    /** Must be one of the allowed rates for the employmentType; defaults if omitted. */
    interestRate?: number;
    /** Day of month for the NACH auto-debit. */
    preferredDebitDay?: 4 | 7 | 12;
}

/** GET /consumer-durable-loans/quote — read-only pricing, creates nothing. */
export interface CdlQuoteInput {
    productValue: number;
    downPayment: number;
    loanAmount: number;
    tenureMonths: number;
    employmentType: 'SALARIED' | 'SELF_EMPLOYED' | 'STUDENT';
    interestRate?: number;
}

export interface CdlQuoteResult {
    loanAmount: number;
    tenureMonths: number;
    interestRate: number;
    /** Authoritative — the same calculation used when the loan is booked. */
    emi: number;
    processingFee: number;
    /** productValue - downPayment, capped at the product maximum. */
    maxEligibleLoan: number;
}

export interface CdlApplicationResult {
    applicationId: string;
    status: string;
    productName: string;
    productValue: number;
    downPayment: number;
    loanAmount: number;
    tenureMonths: number;
    interestRate: number;
    monthlyEmi: number;
    processingFee: number;
    referenceId: string;
    createdAt: string;
    note: string;
}

export interface CdlKycResult {
    applicationId: string;
    kycStatus: 'PASSED' | 'FAILED' | 'PENDING';
    aadhaarVerified: boolean;
    panVerified: boolean;
    faceMatchScore: number;
    note: string;
}

export interface CdlComplianceResult {
    applicationId: string;
    amlStatus: string;
    overallStatus: 'PASSED' | 'FAILED' | 'REVIEW';
    note: string;
}

export interface CdlFoirInput {
    monthlyIncome: number;
    existingObligations: number;
    proposedEmi: number;
}

export interface CdlCreditAssessmentInput {
    // cibilScore deliberately NOT here — it's no longer client-supplied.
    // The service reads it server-side from kyc_documents.credit_score
    // (the real, bureau-verified score), not from request input. Previously
    // a client could submit any value 300-900 directly and the assessment
    // would trust it outright.
    monthlyIncome: number;
    /** Canonical name — the mobile app previously sent `existingObligations`. */
    existingEmis: number;
    proposedEmi: number;
}

export interface CdlNachInput {
    /** The real account number. Never a masked display string. */
    bankAccount: string;
    ifsc: string;
    /**
     * Carried from the application so the mandate is registered against the
     * day the customer actually chose. Previously the mobile app sent this
     * (as `autoDebitDate`) and Joi's stripUnknown dropped it before the
     * service ever saw it.
     */
    preferredDebitDay?: 4 | 7 | 12;
}

export interface CdlCreditAssessment {
    applicationId: string;
    cibilScore: number;
    foir: number;
    foirStatus: 'PASS' | 'FAIL';
    creditStatus: 'PASS' | 'FAIL' | 'REVIEW';
    maxLoanAmount: number;
    note: string;
}

export interface CdlCreditDecision {
    applicationId: string;
    decision: 'APPROVED' | 'REJECTED' | 'PENDING';
    approvedAmount: number | null;
    interestRate: number | null;
    monthlyEmi: number | null;
    rejectionReason: string | null;
    note: string;
}

export interface CdlAgreementResult {
    applicationId: string;
    agreementId: string;
    agreementUrl: string;
    status: 'GENERATED' | 'SIGNED' | 'PENDING';
    eSignRequestId: string | null;
    stampDutyAmount: number;
    note: string;
}

export interface CdlNachResult {
    applicationId: string;
    mandateId: string;
    mandateType: string;
    bankAccount: string;
    maxAmount: number;
    status: string;
    razorpayMandateId: string | null;
    note: string;
}

export interface CdlDisbursalResult {
    applicationId: string;
    disbursalId: string;
    amount: number;
    mode: string;
    merchantName: string;
    status: 'PENDING' | 'COMPLETED' | 'FAILED';
    utrNumber: string | null;
    disbursedAt: string | null;
    note: string;
}

export interface CdlOverdueStatus {
    loanId: string;
    overdueAmount: number;
    overdueDays: number;
    penaltyCharges: number;
    totalDue: number;
    status: 'CURRENT' | 'OVERDUE' | 'NPA';
    note: string;
}

export interface CdlClosureResult {
    loanId: string;
    closureId: string;
    totalAmountPaid: number;
    closedAt: string;
    // Audit finding #14 — pdfService.generateClosureLetter already
    // existed (housing loans could use it too) but CDL never called it.
    closureLetterUrl: string;
    note: string;
}

// processManualPayment previously had no named return type in this file
// at all (an inline object literal) — every other CDL service method has
// one; adding it now rather than leaving this the one exception, since a
// new field (receiptUrl) needs documenting somewhere real.
export interface CdlManualPaymentResult {
    loanId: string;
    emiId: string;
    paymentId: string;
    amountPaid: number;
    penaltyPaid: number;
    totalCollected: number;
    status: string;
    paidAt: string;
    // Audit finding #14 — pdfService.generatePaymentReceipt already
    // existed but CDL never called it.
    receiptUrl: string;
    note: string;
}

// Shared shape for the three new on-demand document endpoints (loan
// statement, repayment schedule, interest certificate) — same
// reference/filename + signed-URL pattern generateNoc already returns
// (there as an inline literal type; promoted to a real named type here
// since three new endpoints share this exact shape).
export interface CdlDocumentResult {
    documentRef: string;
    documentUrl: string;
}

// Audit finding #15 — a generic part-payment endpoint: a lump sum applied
// across whichever EMIs are actually due, oldest first, rather than the
// single named EMI processManualPayment requires. One entry per EMI the
// lump sum actually touched (an EMI it fully settled, or the one it
// partially settled before running out) — each is a distinct payment
// record with its own receipt, same as if the customer had paid each one
// individually via processManualPayment.
export interface CdlPartPaymentEmiApplication {
    emiId: string;
    emiNumber: number;
    amountApplied: number;
    paymentId: string;
    receiptUrl: string;
    // 'PAID' if amountApplied covered this EMI's full remaining due,
    // 'PARTIAL' otherwise (EMI_STATUS values, kept as string here so this
    // type doesn't need to import the constants module just for a label).
    resultingStatus: string;
}

export interface CdlPartPaymentResult {
    loanId: string;
    totalAmountApplied: number;
    emisApplied: CdlPartPaymentEmiApplication[];
    remainingOutstanding: number;
    // Informational only — closing the loan stays a deliberate, separate
    // customer action (POST /loans/:id/close), never auto-triggered here.
    fullyPaidOff: boolean;
    note: string;
}
