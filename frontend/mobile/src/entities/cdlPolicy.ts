// ---------------------------------------------------------------------------
// Consumer Durable Loan — product policy.
//
// Single source of truth for the client's CDL product configuration: pricing,
// eligibility, the credit decision matrix and foreclosure charges. Screens,
// wizard config and services all read from here, so a policy change is a
// one-file change.
//
// Source: client's "Consumer Loan Product Configuration" spec (sections 1, 2,
// 4.1–4.4, 5 and 8). Anything the spec left open is marked OPEN below.
//
// OPEN (awaiting client):
//   • EMI formula — spec says "shared separately in Excel". Until it lands we
//     use the standard reducing-balance formula (calculateEMI in formatters).
//   • Repayment date — spec says "clarification required". We treat the chosen
//     auto-debit date as the repayment date.
//   • FOIR_REVIEW_TOLERANCE — spec sends "FOIR slightly above threshold" to
//     manual review but never defines "slightly". 5pp is our assumption.
// ---------------------------------------------------------------------------

export type CdlCustomerType = 'salaried' | 'self_employed';

// ── 1(e) Loan amount ───────────────────────────────────────────────────────
export const CDL_MIN_LOAN_AMOUNT = 7_000;
export const CDL_MAX_LOAN_AMOUNT = 100_000;
/** 4.1 — auto-approval only applies within this band; above it, manual review. */
export const CDL_AUTO_APPROVE_MAX_AMOUNT = 40_000;

// ── 1(c) Tenure ────────────────────────────────────────────────────────────
export const CDL_MIN_TENURE_MONTHS = 6;
export const CDL_MAX_TENURE_MONTHS = 12;

/** Every whole month the customer may choose: 6, 7, 8 … 12. */
export const CDL_TENURE_OPTIONS: number[] = Array.from(
  { length: CDL_MAX_TENURE_MONTHS - CDL_MIN_TENURE_MONTHS + 1 },
  (_, i) => CDL_MIN_TENURE_MONTHS + i,
);

// ── 1(b) / 2(b) Interest rate ──────────────────────────────────────────────
// A *set* of permitted rates per customer type — the sales agent picks one.
// 0% is the no-cost-EMI (merchant subvention) case.
export const CDL_INTEREST_RATES: Record<CdlCustomerType, number[]> = {
  salaried: [0, 13, 14],
  self_employed: [0, 14, 15],
};

export function cdlInterestRatesFor(customerType: string | undefined): number[] {
  return CDL_INTEREST_RATES[customerType as CdlCustomerType] ?? CDL_INTEREST_RATES.salaried;
}

export function isCdlRateAllowed(customerType: string | undefined, rate: number): boolean {
  return cdlInterestRatesFor(customerType).includes(rate);
}

export function cdlRateLabel(rate: number): string {
  return rate === 0 ? '0% — No-cost EMI' : `${rate}% p.a.`;
}

// ── 1(d) Auto-debit dates ──────────────────────────────────────────────────
export const CDL_AUTO_DEBIT_DATES = [4, 7, 12] as const;
export type CdlAutoDebitDate = (typeof CDL_AUTO_DEBIT_DATES)[number];
export const CDL_DEFAULT_AUTO_DEBIT_DATE: CdlAutoDebitDate = 7;

function ordinal(n: number): string {
  const suffix = n % 10 === 1 && n !== 11 ? 'st' : n % 10 === 2 && n !== 12 ? 'nd' : n % 10 === 3 && n !== 13 ? 'rd' : 'th';
  return `${n}${suffix}`;
}

export function cdlAutoDebitLabel(day: number): string {
  return `${ordinal(day)} of every month`;
}

// ── 2(c) Processing fee ────────────────────────────────────────────────────
export interface CdlFeeSlab {
  min: number;
  max: number;
  fee: number;
}

export const CDL_PROCESSING_FEE_SLABS: CdlFeeSlab[] = [
  { min: 7_000, max: 25_000, fee: 1_463 },
  { min: 25_001, max: 50_000, fee: 1_817 },
  { min: 50_001, max: 100_000, fee: 2_466 },
];

/** Processing fee for a loan amount. Returns 0 outside the sanctionable range. */
export function cdlProcessingFee(amount: number): number {
  const slab = CDL_PROCESSING_FEE_SLABS.find((s) => amount >= s.min && amount <= s.max);
  return slab?.fee ?? 0;
}

// ── 5. FOIR ────────────────────────────────────────────────────────────────
/** Max permissible FOIR — 60% for both salaried and self-employed. */
export const CDL_FOIR_MAX = 60;
/**
 * 4.4 sends "FOIR slightly above threshold" to manual review. The spec does not
 * quantify "slightly"; we allow 5pp of headroom before a hard reject.
 */
export const CDL_FOIR_REVIEW_TOLERANCE = 5;
export const CDL_FOIR_REJECT = CDL_FOIR_MAX + CDL_FOIR_REVIEW_TOLERANCE; // 65

/** FOIR (%) = (existing EMIs + proposed EMI) / net monthly income × 100. */
export function cdlCalculateFoir(input: {
  monthlyIncome: number;
  existingObligations: number;
  proposedEmi: number;
}): number {
  if (input.monthlyIncome <= 0) return 0;
  const ratio = ((input.existingObligations + input.proposedEmi) / input.monthlyIncome) * 100;
  return Math.round(ratio * 10) / 10;
}

// ── 4.2 CIBIL bands ────────────────────────────────────────────────────────
export const CDL_CIBIL_AUTO_APPROVE = 750; // ≥ 750 → auto approve
export const CDL_CIBIL_REVIEW_MIN = 700;   // 700–749 → manual review
                                           // < 700 → reject
/** Sentinel for "no hit" / new-to-credit — 4.2 routes these to manual review. */
export const CDL_CIBIL_NO_HIT = -1;

export type CdlCibilBand = 'auto_approve' | 'manual_review' | 'reject';

export function cdlCibilBand(score: number): CdlCibilBand {
  if (score === CDL_CIBIL_NO_HIT) return 'manual_review'; // new to credit
  if (score >= CDL_CIBIL_AUTO_APPROVE) return 'auto_approve';
  if (score >= CDL_CIBIL_REVIEW_MIN) return 'manual_review';
  return 'reject';
}

// ── 4.1 Auto-approval criteria ─────────────────────────────────────────────
export const CDL_MIN_MONTHLY_INCOME = 15_000;
export const CDL_MIN_AGE = 21;
export const CDL_MAX_AGE = 55;
export const CDL_MIN_BANK_STATEMENT_MONTHS = 3;

/** Age in whole years on a given date (defaults to today). */
export function ageFromDob(dob: string | Date, on: Date = new Date()): number {
  const d = typeof dob === 'string' ? new Date(dob) : dob;
  if (Number.isNaN(d.getTime())) return 0;
  let age = on.getFullYear() - d.getFullYear();
  const beforeBirthday =
    on.getMonth() < d.getMonth() ||
    (on.getMonth() === d.getMonth() && on.getDate() < d.getDate());
  if (beforeBirthday) age -= 1;
  return age;
}

export function isCdlAgeEligible(dob: string | Date): boolean {
  const age = ageFromDob(dob);
  return age >= CDL_MIN_AGE && age <= CDL_MAX_AGE;
}

// ── 8. Foreclosure / pre-closure ───────────────────────────────────────────
/** Foreclosure & pre-closure charge: 5% of principal outstanding + GST. */
export const CDL_FORECLOSURE_RATE = 0.05;
export const CDL_GST_RATE = 0.18;

export interface CdlForeclosureQuote {
  principalOutstanding: number;
  foreclosureCharge: number;
  gst: number;
  totalPayable: number;
}

export function cdlForeclosureQuote(principalOutstanding: number): CdlForeclosureQuote {
  const foreclosureCharge = Math.round(principalOutstanding * CDL_FORECLOSURE_RATE);
  const gst = Math.round(foreclosureCharge * CDL_GST_RATE);
  return {
    principalOutstanding,
    foreclosureCharge,
    gst,
    totalPayable: principalOutstanding + foreclosureCharge + gst,
  };
}

// ── 4.1–4.4 Decision engine ────────────────────────────────────────────────
// 'flagged' is the manual-review outcome (name kept for screen compatibility).
export type CdlDecisionOutcome = 'approved' | 'flagged' | 'rejected';

/** Adverse bureau/KYC flags from 4.3 — any one of these is a hard reject. */
export interface CdlAdverseFlags {
  activeWriteOff?: boolean;
  fraudAlert?: boolean;
  dpd90PlusLast12Months?: boolean;
  multipleOverdueLoans?: boolean;
  kycMismatch?: boolean;
}

/** Soft exceptions from 4.4 — any one of these forces manual review. */
export interface CdlReviewFlags {
  thinCreditFile?: boolean;
  incomeProofMismatch?: boolean;
  bankStatementException?: boolean;
}

export interface CdlEvaluationInput {
  customerType: CdlCustomerType | string;
  dob?: string;
  age?: number;
  monthlyIncome: number;
  existingObligations: number;
  proposedEmi: number;
  loanAmount: number;
  cibilScore: number;
  panVerified?: boolean;
  aadhaarVerified?: boolean;
  bankStatementMonths?: number;
  adverse?: CdlAdverseFlags;
  review?: CdlReviewFlags;
}

export interface CdlEvaluationResult {
  outcome: CdlDecisionOutcome;
  foir: number;
  cibilScore: number;
  cibilBand: CdlCibilBand;
  /** Human-readable rule hits, most significant first. */
  reasons: string[];
  /** One-line summary suitable for a decision banner. */
  summary: string;
}

/**
 * Apply the client's decision matrix.
 *
 * Order of evaluation:
 *   1. Hard rejects (4.3 adverse flags, CIBIL < 700, FOIR > 65%).
 *   2. Manual review (4.4 exceptions, CIBIL 700–749 / no-hit, FOIR 60–65%,
 *      loan amount above the ₹40k auto-approval ceiling, 4.1 breaches).
 *   3. Auto-approve — every 4.1 criterion met AND CIBIL ≥ 750.
 */
export function evaluateCdlApplication(input: CdlEvaluationInput): CdlEvaluationResult {
  const foir = cdlCalculateFoir(input);
  const band = cdlCibilBand(input.cibilScore);
  const age = input.age ?? (input.dob ? ageFromDob(input.dob) : undefined);

  // ── 1. Hard rejects (4.3) ────────────────────────────────────────────────
  const rejects: string[] = [];
  const a = input.adverse ?? {};
  if (a.activeWriteOff) rejects.push('Active write-off account in bureau report.');
  if (a.fraudAlert) rejects.push('Fraud alert flagged in bureau report.');
  if (a.dpd90PlusLast12Months) rejects.push('90+ DPD reported in the last 12 months.');
  if (a.multipleOverdueLoans) rejects.push('Multiple overdue loans.');
  if (a.kycMismatch) rejects.push('KYC mismatch.');
  if (band === 'reject') {
    rejects.push(`CIBIL ${input.cibilScore} is below the minimum of ${CDL_CIBIL_REVIEW_MIN}.`);
  }
  if (foir > CDL_FOIR_REJECT) {
    rejects.push(`FOIR ${foir}% exceeds the maximum of ${CDL_FOIR_MAX}%.`);
  }
  if (input.loanAmount < CDL_MIN_LOAN_AMOUNT || input.loanAmount > CDL_MAX_LOAN_AMOUNT) {
    rejects.push(
      `Loan amount must be between ₹${CDL_MIN_LOAN_AMOUNT.toLocaleString('en-IN')} and ₹${CDL_MAX_LOAN_AMOUNT.toLocaleString('en-IN')}.`,
    );
  }

  if (rejects.length > 0) {
    return {
      outcome: 'rejected',
      foir,
      cibilScore: input.cibilScore,
      cibilBand: band,
      reasons: rejects,
      summary: rejects[0],
    };
  }

  // ── 2. Manual review (4.4 + 4.1 breaches) ────────────────────────────────
  const reviews: string[] = [];
  const r = input.review ?? {};

  if (band === 'manual_review') {
    reviews.push(
      input.cibilScore === CDL_CIBIL_NO_HIT
        ? 'No bureau hit — new to credit.'
        : `CIBIL ${input.cibilScore} is in the ${CDL_CIBIL_REVIEW_MIN}–${CDL_CIBIL_AUTO_APPROVE - 1} manual-review band.`,
    );
  }
  if (foir > CDL_FOIR_MAX) {
    reviews.push(`FOIR ${foir}% is slightly above the ${CDL_FOIR_MAX}% threshold.`);
  }
  if (input.loanAmount > CDL_AUTO_APPROVE_MAX_AMOUNT) {
    reviews.push(
      `Loan amount ₹${input.loanAmount.toLocaleString('en-IN')} is above the ₹${CDL_AUTO_APPROVE_MAX_AMOUNT.toLocaleString('en-IN')} auto-approval ceiling.`,
    );
  }
  if (input.monthlyIncome < CDL_MIN_MONTHLY_INCOME) {
    reviews.push(
      `Monthly income ₹${input.monthlyIncome.toLocaleString('en-IN')} is below the ₹${CDL_MIN_MONTHLY_INCOME.toLocaleString('en-IN')} minimum.`,
    );
  }
  if (age !== undefined && (age < CDL_MIN_AGE || age > CDL_MAX_AGE)) {
    reviews.push(`Age ${age} is outside the ${CDL_MIN_AGE}–${CDL_MAX_AGE} band.`);
  }
  if (input.panVerified === false || input.aadhaarVerified === false) {
    reviews.push('PAN / Aadhaar KYC not fully verified.');
  }
  if (
    input.bankStatementMonths !== undefined &&
    input.bankStatementMonths < CDL_MIN_BANK_STATEMENT_MONTHS
  ) {
    reviews.push(`Fewer than ${CDL_MIN_BANK_STATEMENT_MONTHS} months of bank statements.`);
  }
  if (r.thinCreditFile) reviews.push('Thin credit file.');
  if (r.incomeProofMismatch) reviews.push('Income proof mismatch.');
  if (r.bankStatementException) reviews.push('Bank statement exceptions.');

  if (reviews.length > 0) {
    return {
      outcome: 'flagged',
      foir,
      cibilScore: input.cibilScore,
      cibilBand: band,
      reasons: reviews,
      summary: reviews[0],
    };
  }

  // ── 3. Auto-approve (4.1 + CIBIL ≥ 750) ──────────────────────────────────
  return {
    outcome: 'approved',
    foir,
    cibilScore: input.cibilScore,
    cibilBand: band,
    reasons: [
      `CIBIL ${input.cibilScore} ≥ ${CDL_CIBIL_AUTO_APPROVE}.`,
      `FOIR ${foir}% within the ${CDL_FOIR_MAX}% limit.`,
      `Loan amount within the ₹${CDL_AUTO_APPROVE_MAX_AMOUNT.toLocaleString('en-IN')} auto-approval ceiling.`,
    ],
    summary: `Auto-approved — CIBIL ${input.cibilScore} and FOIR ${foir}% meet every auto-approval criterion.`,
  };
}
