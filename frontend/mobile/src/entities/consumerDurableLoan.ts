// Consumer Durable Loan (CDL) domain types.
// Mirrors the LOS + LMS workflow: Application → KYC → Compliance → Credit
// Assessment → Credit Decision → Agent Review (if flagged) → Agreement →
// NACH → Disbursal → Activation → EMI Cycle → Failure/Overdue → Closure.

export const CDL_ANNUAL_INTEREST_RATE = 18; // % p.a. reducing balance
export const CDL_FOIR_LIMIT = 50; // % — above this the application is flagged
export const CDL_FOIR_REJECT = 65; // % — above this the application is rejected
export const CDL_CIBIL_APPROVE = 720;
export const CDL_CIBIL_REJECT = 650;

export type CdlStepStatus = 'pending' | 'in_progress' | 'completed' | 'failed';
export type CdlCheckStatus = 'pending' | 'passed' | 'failed' | 'review';
export type CdlDecision = 'approved' | 'flagged' | 'rejected';

export interface CdlApplicationInput {
  productName: string;
  amount: number;
  tenure: number;
  emi: number;
  monthlyIncome?: number;
  employmentType?: string;
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
  employmentType: string;
  annualIncome: number;
  monthlyIncome: number;
  cibilScore: number;
  existingObligations: number;
  proposedEmi: number;
  foir: number;
  foirLimit: number;
  foirStatus: 'passed' | 'flagged' | 'failed';
}

export interface CdlCreditDecision {
  applicationId: string;
  decision: CdlDecision;
  cibilScore: number;
  foir: number;
  approvedAmount: number;
  reason: string;
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
