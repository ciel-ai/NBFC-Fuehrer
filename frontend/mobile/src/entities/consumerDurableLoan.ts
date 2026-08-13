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

// ─── CANONICAL CDL REQUEST CONTRACT ───────────────────────────────────────────
//
// These request types MIRROR the backend's canonical contract at
// backend/business-module/src/modules/cdlLoans/cdlLoans.types.ts, which is the
// single source of truth. Field names and required/optional must match it
// exactly — the backend validates with stripUnknown:true, so a field named
// differently here is not an error the app can see: it is silently deleted
// before the service ever runs, and a required field arrives missing.
//
// That is exactly what used to happen. This type previously declared
// `amount`, `tenure`, `emi`, `autoDebitDate` and an optional `productValue`,
// none of which the API accepts, while omitting productCategory, downPayment,
// storeName and storeCity, all of which it requires. Every real CDL
// application submission failed validation outright.
//
// Response types further down are deliberately NOT mirrors — see the note
// above CdlKycResult.

/** Backend enum casing. The UI displays lowercase; the wire is uppercase. */
export type CdlEmploymentType = 'SALARIED' | 'SELF_EMPLOYED' | 'STUDENT';

export type CdlProductCategory =
  | 'TV_APPLIANCES'
  | 'MOBILES_TABLETS'
  | 'LAPTOPS'
  | 'FURNITURE'
  | 'AC'
  | 'OTHERS';

/**
 * Maps a category id onto the wire enum.
 *
 * The customer flow no longer has categories — it replaced the hardcoded
 * catalogue with manual product entry, so nothing there calls this. Kept for
 * the in-store sales wizard, whose retail-shop lookup returns
 * `productCategories`, and so an application that does know its category can
 * still state it rather than defaulting to OTHERS.
 */
export function toCdlProductCategory(categoryId: string | undefined): CdlProductCategory {
  switch ((categoryId ?? '').toLowerCase()) {
    case 'mobile':
    case 'mobiles_tablets':
      return 'MOBILES_TABLETS';
    case 'home_appliance':
    case 'tv_appliances':
      return 'TV_APPLIANCES';
    case 'laptop':
    case 'laptops':
      return 'LAPTOPS';
    case 'ac':
      return 'AC';
    case 'furniture':
      return 'FURNITURE';
    default:
      return 'OTHERS';
  }
}

/** Maps the UI's lowercase customer type onto the wire enum. */
export function toCdlEmploymentType(value: CdlCustomerType | string | undefined): CdlEmploymentType {
  switch ((value ?? '').toLowerCase()) {
    case 'self_employed':
    case 'self-employed':
      return 'SELF_EMPLOYED';
    case 'student':
      return 'STUDENT';
    default:
      return 'SALARIED';
  }
}

/** GET /consumer-durable-loans/quote — read-only pricing, creates nothing. */
export interface CdlQuoteInput {
  productValue: number;
  downPayment: number;
  loanAmount: number;
  tenureMonths: number;
  employmentType: CdlEmploymentType;
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

export interface CdlApplicationInput {
  /**
   * Optional since the customer flow uses manual product entry — there is no
   * catalogue to derive a category from. The in-store sales wizard may set it.
   */
  productCategory?: CdlProductCategory;
  productName: string;
  /** Invoice value of the item (2a) — manually entered, no product pop-up. */
  productValue: number;
  downPayment: number;
  /** The principal. productValue - downPayment. */
  loanAmount: number;
  tenureMonths: number;
  storeName: string;
  storeCity: string;
  employmentType: CdlEmploymentType;
  monthlyIncome: number;
  /** Rate chosen from the customer type's permitted set. */
  interestRate?: number;
  /** Day of month for the NACH auto-debit — 4, 7 or 12. */
  preferredDebitDay?: 4 | 7 | 12;
}

/** POST /applications/:id/credit-assessment and /credit-decision. */
export interface CdlCreditAssessmentInput {
  monthlyIncome: number;
  /** Existing monthly EMI obligations. Was `existingObligations` here. */
  existingEmis: number;
  proposedEmi: number;
}

/** POST /applications/:id/nach. */
export interface CdlNachInput {
  /** The real account number — never the masked display string. */
  bankAccount: string;
  ifsc: string;
  preferredDebitDay?: 4 | 7 | 12;
}

// ─── RESPONSE VIEW MODELS ─────────────────────────────────────────────────────
//
// Unlike the request types above, these are NOT wire mirrors. They are the
// shapes the screens render, and the real service adapts each backend response
// into them (see realConsumerDurableLoanService — every adapter is named and
// commented). The mock service produces the same shapes, which is what lets
// USE_MOCK swap cleanly.
//
// Keeping them distinct is deliberate: the backend returns a flat
// CdlKycResult { aadhaarVerified, panVerified, faceMatchScore }, while these
// screens render a checklist of named provider checks. That is a genuine
// presentation transformation, not a naming accident.

export interface CdlApplicationResult {
  applicationId: string;
  status: 'submitted';
  productName: string;
  /** Rupees. Canonical `loanAmount` on the wire. */
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
