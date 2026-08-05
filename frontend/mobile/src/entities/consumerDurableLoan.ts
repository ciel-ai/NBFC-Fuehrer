// Consumer Durable Loan (CDL) domain types.
// Mirrors the LOS + LMS workflow: Application → KYC → Compliance → Credit
// Assessment → Credit Decision → Agent Review (if flagged) → Agreement →
// NACH → Disbursal → Activation → EMI Cycle → Failure/Overdue → Closure.
//
// Product rules (rates, FOIR, CIBIL bands, fees, tenure, foreclosure) live in
// ./cdlPolicy — this file is types only.

import {
  CDL_CIBIL_AUTO_APPROVE,
  CDL_FOIR_MAX,
  CDL_INTEREST_RATES,
  type CdlCustomerType,
  type CdlDecisionOutcome,
} from './cdlPolicy';

export * from './cdlPolicy';

/**
 * Fallback rate when none has been chosen yet (e.g. the pre-login EMI
 * calculator). The real rate is picked per application from the customer
 * type's permitted set — see CDL_INTEREST_RATES.
 */
export const CDL_DEFAULT_INTEREST_RATE = CDL_INTEREST_RATES.salaried[1]; // 13%

/** @deprecated Use CDL_FOIR_MAX. Kept so older imports keep compiling. */
export const CDL_FOIR_LIMIT = CDL_FOIR_MAX;
/** @deprecated Use CDL_CIBIL_AUTO_APPROVE. */
export const CDL_CIBIL_APPROVE = CDL_CIBIL_AUTO_APPROVE;

export type CdlStepStatus = 'pending' | 'in_progress' | 'completed' | 'failed';
export type CdlCheckStatus = 'pending' | 'passed' | 'failed' | 'review';
/** 'flagged' == the spec's "Manual Review" outcome. */
export type CdlDecision = CdlDecisionOutcome;

export interface CdlApplicationInput {
  productName: string;
  /** Manually entered product value (2a) — no product pop-up list. */
  productValue?: number;
  amount: number;
  tenure: number;
  emi: number;
  /** Rate chosen from the customer type's permitted set. */
  interestRate?: number;
  processingFee?: number;
  /** Day of month for the NACH auto-debit — 4, 7 or 12. */
  autoDebitDate?: number;
  monthlyIncome?: number;
  employmentType?: CdlCustomerType | string;
  merchantName?: string;
}

export interface CdlApplicationResult {
  applicationId: string;
  status: 'submitted';
  productName: string;
  amount: number;
  tenure: number;
  emi: number;
  interestRate: number;
}

export interface CdlVerificationCheck {
  label: string;
  provider: string;
  status: CdlCheckStatus;
  detail?: string;
}

export interface CdlKycResult {
  applicationId: string;
  status: CdlStepStatus;
  checks: CdlVerificationCheck[];
}

export interface CdlComplianceResult {
  applicationId: string;
  overall: 'passed' | 'review' | 'failed';
  checks: CdlVerificationCheck[];
}

export interface CdlFoirInput {
  monthlyIncome: number;
  existingObligations: number;
  proposedEmi: number;
}

export interface CdlCreditAssessment {
  applicationId: string;
  employmentVerified: boolean;
  employmentType: CdlCustomerType | string;
  annualIncome: number;
  monthlyIncome: number;
  cibilScore: number;
  existingObligations: number;
  proposedEmi: number;
  foir: number;
  foirLimit: number;
  foirStatus: 'passed' | 'flagged' | 'failed';
  /** Applicant age — 4.1 requires 21–55. */
  age?: number;
  loanAmount?: number;
}

export interface CdlCreditDecision {
  applicationId: string;
  decision: CdlDecision;
  cibilScore: number;
  foir: number;
  approvedAmount: number;
  reason: string;
  /** Every rule that fired, most significant first (4.1–4.4). */
  reasons: string[];
  requiresAgentReview: boolean;
}

export interface CdlAgentReviewDecision {
  applicationId: string;
  outcome: 'approved' | 'rejected' | 'docs_requested';
  note?: string;
}

export interface CdlAgreementResult {
  agreementId: string;
  status: CdlStepStatus;
  stampRef?: string;
  esignRef?: string;
  s3Url?: string;
  amount: number;
  tenure: number;
  emi: number;
  interestRate: number;
}

export interface CdlNachResult {
  mandateId: string;
  status: CdlStepStatus;
  debitDate: string;
  emi: number;
  bankAccount: string;
}

export interface CdlDisbursalResult {
  payoutId: string;
  status: CdlStepStatus;
  amount: number;
  merchantName: string;
  loanAccountId: string;
  disbursedAt: string;
}

export interface CdlPaymentFailure {
  emiId: string;
  failureReason: string;
  provider: string;
  retryScheduledAt: string;
  penalty: number;
  nextEmiWithPenalty: number;
  alertSent: boolean;
}

export interface CdlOverdueStage {
  day: number;
  label: string;
  description: string;
  status: 'done' | 'active' | 'pending';
}

export interface CdlOverdueStatus {
  loanId: string;
  daysOverdue: number;
  penaltyAccrued: number;
  stages: CdlOverdueStage[];
}

export interface CdlManualPaymentResult {
  paymentId: string;
  emiId: string;
  amount: number;
  status: 'captured';
  receiptId: string;
  receiptS3Url: string;
  paidAt: string;
  nextDueDate: string | null;
}

export interface CdlClosureResult {
  loanId: string;
  status: 'closed';
  finalEmiPaid: boolean;
  nocRef: string;
  nocS3Url: string;
  mandateCancelled: boolean;
  customerNotified: boolean;
  closedAt: string;
}
