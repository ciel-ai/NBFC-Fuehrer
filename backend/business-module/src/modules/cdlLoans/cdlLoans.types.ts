// src/modules/cdlLoans/cdlLoans.types.ts

export interface CdlApplicationInput {
    productCategory: 'TV_APPLIANCES' | 'MOBILES_TABLETS' | 'LAPTOPS' | 'FURNITURE' | 'AC' | 'OTHERS';
    productName: string;
    productPrice: number;
    downPayment: number;
    loanAmount: number;
    tenureMonths: number;
    storeName: string;
    storeCity: string;
    employmentType: 'SALARIED' | 'SELF_EMPLOYED' | 'STUDENT';
    monthlyIncome: number;
    interestRatePct?: number;   // must be one of the allowed rates for the employmentType; defaults if omitted
    autoDebitDate?: 4 | 7 | 12;
}

export interface CdlApplicationResult {
    applicationId: string;
    status: string;
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
    existingEmis: number;
    proposedEmi: number;
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
