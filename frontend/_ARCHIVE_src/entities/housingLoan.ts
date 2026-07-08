// Affordable Housing Loan domain types (secured-by-property, 20-yr tenure).
// LOS: Application → Co-applicant → KYC (both) → Compliance → Income → Credit →
// Property (CERSAI/legal/technical) → Mandatory Agent Review → Agreement (eSign
// both) → NACH → PMAY Subsidy → Builder Disbursal.
// LMS: Activation → EMI → Partial Prepayment → Overdue (Day-30 legal) → Closure.

export const HOUSING_INTEREST_RATE = 8.4; // % p.a.
export const HOUSING_MAX_LTV = 80; // % — above this the application is rejected
export const HOUSING_FOIR_LIMIT = 50; // %

export type HousingStepStatus = 'pending' | 'in_progress' | 'completed' | 'failed';
export type HousingCheckStatus = 'pending' | 'passed' | 'failed' | 'review';
export type HousingApplicant = 'primary' | 'co';

export interface HousingApplicationInput {
  amount: number;
  tenure: number; // years
  propertyType: string;
  hasCoApplicant: boolean;
  builderName?: string;
  agreementValue?: number;
  combinedIncome?: number;
}

export interface HousingApplicationResult {
  applicationId: string;
  status: 'submitted';
  amount: number;
  tenure: number;
  interestRate: number;
  emi: number;
}

export interface HousingVerificationCheck {
  label: string;
  provider: string;
  status: HousingCheckStatus;
  detail?: string;
}

export interface HousingKycResult {
  applicationId: string;
  applicant: HousingApplicant;
  status: HousingStepStatus;
  checks: HousingVerificationCheck[];
}

export interface HousingComplianceResult {
  applicationId: string;
  overall: 'passed' | 'review' | 'failed';
  applicants: Array<{
    applicant: HousingApplicant;
    name: string;
    checks: HousingVerificationCheck[];
  }>;
}

export interface HousingIncomeAssessment {
  applicationId: string;
  itrYearsParsed: number;
  avgAnnualProfit: number;
  gstinVerified: boolean;
  gstFilingMonths: number;
  businessVintageYears: number;
  primaryMonthlyIncome: number;
  coApplicantMonthlyIncome: number;
  combinedMonthlyIncome: number;
}

export interface HousingCreditAssessment {
  applicationId: string;
  primaryCibil: number;
  coApplicantCibil: number | null;
  emiEstimate: number;
  existingObligations: number;
  combinedMonthlyIncome: number;
  foir: number;
  foirLimit: number;
  foirStatus: 'passed' | 'flagged' | 'failed';
}

export interface HousingPropertyAssessment {
  applicationId: string;
  cersaiStatus: HousingCheckStatus;
  encumbranceFound: boolean;
  legalStatus: HousingCheckStatus;
  technicalValuation: number;
  ltv: number;
  ltvWithinPolicy: boolean;
  negativeArea: boolean;
  pmayEligible: boolean;
  pmaySubsidy: number;
  /** Aggregate gate: 'pass' continue, 'review' agent, 'reject' rejection screen. */
  outcome: 'pass' | 'review' | 'reject';
  rejectionReason?: string;
}

export interface HousingDecision {
  applicationId: string;
  decision: 'approved' | 'rejected';
  reviewer: string;
  sanctionedAmount: number;
  emi: number;
  note?: string;
}

export interface HousingAgreementResult {
  agreementId: string;
  status: HousingStepStatus;
  stampRef?: string; // NeSL (higher stamp duty)
  stampDuty: number;
  primaryEsignRef?: string; // eMudhra
  coApplicantEsignRef?: string; // eMudhra
  s3Url?: string;
  amount: number;
  tenure: number;
  emi: number;
}

export interface HousingNachResult {
  mandateId: string;
  status: HousingStepStatus;
  debitDate: string;
  emi: number;
  bankAccount: string;
}

export interface HousingPmaySubsidyResult {
  applicationId: string;
  subsidyAmount: number;
  status: 'credited';
  nhbRef: string;
  originalLoan: number;
  effectiveLoanBurden: number;
}

export interface HousingDisbursalResult {
  payoutId: string;
  status: HousingStepStatus;
  amount: number;
  builderName: string;
  builderAccount: string;
  loanAccountId: string;
  disbursedAt: string;
}

export interface HousingPrepaymentQuote {
  loanId: string;
  outstandingPrincipal: number;
  prepaymentAmount: number;
  newOutstanding: number;
  currentTenureMonths: number;
  currentEmi: number;
  reduceTenureOption: { newTenureMonths: number; emi: number };
  reduceEmiOption: { tenureMonths: number; newEmi: number };
}

export interface HousingPrepaymentResult {
  loanId: string;
  paymentId: string;
  option: 'reduce_tenure' | 'reduce_emi';
  newOutstanding: number;
  newTenureMonths: number;
  newEmi: number;
}

export interface HousingOverdueStatus {
  loanId: string;
  daysOverdue: number;
  penaltyAccrued: number;
  stages: Array<{
    day: number;
    label: string;
    description: string;
    status: 'done' | 'active' | 'pending';
  }>;
}

export interface HousingClosureResult {
  loanId: string;
  status: 'closed';
  finalEmiPaid: boolean;
  propertyDocsReleased: boolean;
  nocRef: string;
  nocS3Url: string;
  mandateCancelled: boolean;
  customerNotified: boolean;
  closedAt: string;
}
