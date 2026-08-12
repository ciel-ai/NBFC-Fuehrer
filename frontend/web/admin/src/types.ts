// ─── Domain types for FUEHRER NBFC LOS + LMS ────────────────────────────────

export type LoanType = 'CDL' | 'GOLD' | 'HOUSING';

export type AppStatus =
  | 'SUBMITTED'
  | 'CREDIT_PENDING'
  | 'CREDIT_APPROVED'
  | 'CREDIT_REJECTED'
  | 'CREDIT_RETURNED'
  | 'FINANCE_PENDING'
  | 'EMANDATE_PENDING'
  | 'DISBURSED'
  | 'ACTIVE'
  | 'CLOSED';

export type Role =
  // Product-based roles (Admin Panel)
  | 'ADMIN'
  | 'CREDIT_CDL'
  | 'CREDIT_GOLD'
  | 'CREDIT_HOUSING'
  | 'FINANCE_CDL'
  | 'FINANCE_GOLD'
  | 'FINANCE_HOUSING'
  // Sales roles — provisioned here by Admin but sign in only on the
  // React Native field app — the web dashboard rejects their login.
  | 'SALES_CDL'
  | 'SALES_GOLD'
  | 'SALES_HOUSING'
  // Backend roles
  | 'SUPER_ADMIN'
  | 'CREDIT_MANAGER'
  | 'BRANCH_MANAGER'
  | 'OPS_EXECUTIVE'
  | 'FINANCE'
  | 'COLLECTION_AGENT'
  | 'AGENT';

export type RiskGrade = 'A' | 'B' | 'C' | 'D';

export interface Address {
  line1: string;
  line2?: string;
  city: string;
  state: string;
  pincode: string;
  residenceType?: 'Owned' | 'Rented' | 'Family Owned' | 'Company Provided';
  yearsAtAddress?: number;
}

export interface Employment {
  type: 'Salaried' | 'Self-Employed' | 'Business Owner' | 'Agriculturist';
  employer: string;
  designation: string;
  yearsInJob: number;
  officialEmail?: string;
}

export interface IncomeDetails {
  monthlyIncome: number;
  otherIncome: number;
  existingObligations: number;
  foir: number; // fixed obligation to income ratio, %
}

export interface KycInfo {
  aadhaarMasked: string;
  aadhaarVerified: boolean;
  aadhaarVerifiedAt?: string;
  panNumber: string;
  panVerified: boolean;
  panNameMatch?: number; // % match
  ckycNumber?: string;
  videoKycStatus: 'COMPLETED' | 'PENDING' | 'NOT_REQUIRED';
  livenessScore?: number;
}

export type DocStatus = 'VERIFIED' | 'PENDING' | 'REJECTED';

export interface AppDocument {
  id: string;
  name: string;
  category: 'KYC' | 'Income' | 'Banking' | 'Collateral' | 'Other';
  fileName: string;
  sizeKB: number;
  uploadedAt: string;
  status: DocStatus;
  remarks?: string;
}

export interface BureauAccount {
  lender: string;
  type: string;
  sanctioned: number;
  outstanding: number;
  openedOn: string;
  status: 'Active' | 'Closed' | 'Written-Off';
}

export interface BureauReport {
  score: number;
  reportDate: string;
  enquiries6m: number;
  totalAccounts: number;
  activeAccounts: number;
  overdueAccounts: number;
  oldestAccountYears: number;
  paymentHistory: ('ON_TIME' | 'DELAYED' | 'MISSED')[]; // last 24 months, newest first
  accounts: BureauAccount[];
}

export interface TimelineEvent {
  id: string;
  stage: string;
  title: string;
  description?: string;
  actor: string;
  role: string;
  at: string;
  remarks?: string;
}

export interface CreditDecision {
  decidedBy: string;
  decidedAt: string;
  riskGrade: RiskGrade;
  decision: 'APPROVED' | 'REJECTED' | 'RETURNED';
  approvedAmount?: number;
  approvedTenure?: number;
  approvedRate?: number;
  reason?: string;
  remarks: string;
  /** Deviation ids that were OPEN→APPROVED and recorded on this sanction. */
  approvedDeviationIds?: string[];
}

// ─── Deviations (Sprint-4) ───────────────────────────────────────────────────
// Auto-derived + manually-raised policy exceptions. An APPROVED credit decision
// is blocked while any deviation is OPEN — mirrors the server 409
// OPEN_DEVIATIONS gate (see docs/GOLD_LOAN_S4_API_CONTRACTS.md §2).

export type DeviationSeverity = 'L1' | 'L2'; // L1 → Branch Manager+; L2 → Credit Manager/Admin
export type DeviationCategory = 'LTV' | 'PURITY' | 'KYC' | 'INCOME' | 'DOCUMENT' | 'BUREAU' | 'OTHER';
export type DeviationStatus = 'OPEN' | 'APPROVED' | 'REJECTED' | 'WITHDRAWN';

export interface Deviation {
  id: string;
  /** Machine code, e.g. LTV_ABOVE_CAP. */
  code: string;
  category: DeviationCategory;
  severity: DeviationSeverity;
  description: string;
  /** 'SYSTEM' for auto-derived, else the raising officer's name. */
  raisedBy: string;
  /** Maker's justification — required to APPROVE the deviation. */
  mitigant?: string;
  status: DeviationStatus;
  decidedBy?: string;
  decidedRole?: string;
  decidedRemarks?: string;
  decidedAt?: string;
  createdAt: string;
}

// ─── TVR — Tele-Verification (Sprint-4 §3) ───────────────────────────────────

export type TvrAnswer = 'YES' | 'NO' | 'UNCLEAR' | 'NA';
export type TvrOutcome = 'POSITIVE' | 'NEGATIVE' | 'INCONCLUSIVE';
export type TvrCallStatus = 'COMPLETED' | 'NO_ANSWER' | 'WRONG_NUMBER';
/** Derived roll-up shown on the application. */
export type VerificationStatus = 'PENDING' | 'POSITIVE' | 'NEGATIVE' | 'INCONCLUSIVE' | 'WAIVED';

export interface TvrChecklistItem {
  key: string;
  label: string;
  answer: TvrAnswer;
}

export interface TvrRecord {
  id: string;
  applicationId: string;
  attemptNo: number;
  phoneCalled: string;
  calledBy: string;
  checklist: TvrChecklistItem[];
  outcome: TvrOutcome;
  remarks: string;
  status: TvrCallStatus;
  createdAt: string;
}

// ─── CPV — Contact-Point Verification (Sprint-4 §4) ──────────────────────────

export type CpvType = 'RESIDENCE' | 'OFFICE';
export type CpvRelation = 'SELF' | 'FAMILY' | 'NEIGHBOUR' | 'OTHER';
export type CpvOutcome = 'POSITIVE' | 'NEGATIVE' | 'DOOR_LOCKED' | 'ADDRESS_NOT_FOUND';
export type CpvVerificationStatus = 'PENDING' | 'POSITIVE' | 'NEGATIVE' | 'INCONCLUSIVE' | 'WAIVED';

export interface CpvRecord {
  id: string;
  applicationId: string;
  type: CpvType;
  assignedTo: string;
  visitDate: string;
  addressVerified: boolean;
  personMet: string;
  relation: CpvRelation;
  outcome: CpvOutcome;
  remarks: string;
  createdAt: string;
}

/** A TVR/CPV waiver — credit/admin only; auto-raises an L1 deviation. */
export interface VerificationWaiver {
  remarks: string;
  by: string;
  role: string;
  at: string;
}

export interface BankDetails {
  accountName: string;
  accountNumber: string;
  ifsc: string;
  bankName: string;
  branch: string;
  pennyDropStatus: 'SUCCESS' | 'PENDING' | 'FAILED';
}

export interface EMandate {
  status: 'NOT_SETUP' | 'PENDING' | 'ACTIVE' | 'FAILED';
  umrn?: string;
  bank?: string;
  maxAmount?: number;
  frequency?: string;
  registeredAt?: string;
  mode?: 'Net Banking' | 'Debit Card' | 'Aadhaar';
}

export interface Disbursement {
  utr: string;
  mode: 'NEFT' | 'RTGS' | 'IMPS';
  date: string;
  amount: number;
  processedBy: string;
}

export interface FeeBreakup {
  processingFee: number;
  gst: number;
  insurance: number;
  stampDuty: number;
  documentation: number;
}

export interface GoldCollateral {
  netWeightGrams: number; // derived: (gross − stone) × (1 − impurity%/100)
  grossWeightGrams: number;
  stoneWeightGrams?: number;
  impurityPct?: number;
  purityKarat: 18 | 20 | 22 | 24;
  ratePerGram: number;
  valuation: number;
  ltv: number; // %
  items: { description: string; weightGrams: number }[];
  valuedBy: string;
  appraisedAt?: string;
}

export interface PropertyDetails {
  type: 'Flat' | 'Independent House' | 'Plot + Construction' | 'Row House';
  address: string;
  marketValue: number;
  ltv: number; // %
  builder?: string;
  constructionStage?: string;
  valuedBy?: string;
  appraisedAt?: string;
}

export interface CustomerProfile {
  name: string;
  dob: string;
  age: number;
  gender: 'Male' | 'Female';
  maritalStatus: 'Married' | 'Single' | 'Widowed';
  fatherOrSpouseName: string;
  mobile: string;
  altMobile?: string;
  email: string;
  dependents: number;
  currentAddress: Address;
  permanentAddress: Address;
  employment: Employment;
  income: IncomeDetails;
}

export interface LoanApplication {
  id: string;
  appNumber: string;
  loanType: LoanType;
  status: AppStatus;
  customer: CustomerProfile;
  kyc: KycInfo;
  documents: AppDocument[];
  bureau: BureauReport;
  loan: {
    amount: number;
    tenureMonths: number;
    interestRate: number;
    purpose: string;
    emi: number;
    scheme: string;
    /** CDL only — the financed item and its invoice value. Absent otherwise. */
    productName?: string;
    productValue?: number;
    downPayment?: number;
    /** CDL only — the value used to determine the permitted interest-rate set. */
    employmentType?: 'SALARIED' | 'SELF_EMPLOYED';
  };
  collateral?: {
    gold?: GoldCollateral;
    property?: PropertyDetails;
  };
  source: 'Mobile App' | 'Branch' | 'DSA' | 'Website';
  createdBy: string;
  createdByCode: string;
  branch: string;
  createdAt: string;
  updatedAt: string;
  creditDecision?: CreditDecision;
  /** Policy deviations — lazily initialised (auto-derived) when first needed. */
  deviations?: Deviation[];
  /** Tele-verification attempts (newest first) + optional waiver. */
  tvr?: TvrRecord[];
  tvrWaiver?: VerificationWaiver;
  /** Contact-point verification visits + optional waiver. */
  cpv?: CpvRecord[];
  cpvWaiver?: VerificationWaiver;
  finance?: {
    fees: FeeBreakup;
    netDisbursement: number;
    bank: BankDetails;
    emandate: EMandate;
    disbursement?: Disbursement;
    verifiedBy?: string;
    verifiedAt?: string;
  };
  timeline: TimelineEvent[];
  loanNumber?: string;
}

// ─── LMS ────────────────────────────────────────────────────────────────────

export type EmiStatus = 'PAID' | 'OVERDUE' | 'DUE' | 'UPCOMING';

export interface EmiRow {
  seq: number;
  dueDate: string;
  principal: number;
  interest: number;
  emi: number;
  balance: number;
  status: EmiStatus;
  paidOn?: string;
  paidAmount?: number;
}

export interface Repayment {
  id: string;
  loanNumber: string;
  customerName: string;
  loanType: LoanType;
  date: string;
  amount: number;
  mode: 'E-MANDATE' | 'UPI' | 'NEFT' | 'CASH' | 'CHEQUE';
  reference: string;
  emiSeq?: number;
  status: 'SUCCESS' | 'BOUNCED' | 'PENDING';
  type: 'EMI' | 'PART_PAYMENT' | 'FORECLOSURE' | 'RECOVERY';
}

export interface LoanCharge {
  id: string;
  loanNumber: string;
  customerName: string;
  loanType: LoanType;
  date: string;
  type: 'PROCESSING_FEE' | 'BOUNCE_CHARGE' | 'PENAL_INTEREST' | 'FORECLOSURE_CHARGE' | 'LEGAL_CHARGE';
  amount: number;
  gst: number;
  status: 'PAID' | 'UNPAID' | 'WAIVED';
}

export type LoanStatus = 'ACTIVE' | 'OVERDUE' | 'NPA' | 'CLOSED';
export type CollectionStatus = 'NORMAL' | 'FOLLOW_UP' | 'PTP' | 'FIELD_VISIT' | 'LEGAL';

/**
 * Balanced account of where one payment went. All amounts are INTEGER PAISE.
 *
 * Invariant, enforced by utils/payments.ts and asserted in payments.test.ts:
 *   settledPaise + closingAdvancePaise === openingAdvancePaise + tenderPaise
 */
export interface PaymentAllocation {
  tenderPaise: number;
  openingAdvancePaise: number;
  settledPaise: number;
  closingAdvancePaise: number;
  settledSeqs: number[];
}

export interface LoanAccount {
  loanNumber: string;
  applicationId: string;
  appNumber: string;
  customerName: string;
  mobile: string;
  loanType: LoanType;
  principal: number;
  interestRate: number;
  tenureMonths: number;
  emi: number;
  disbursedOn: string;
  firstEmiDate: string;
  nextDueDate?: string;
  paidCount: number;
  outstandingPrincipal: number;
  overdueAmount: number;
  dpd: number;
  status: LoanStatus;
  collectionStatus: CollectionStatus;
  collectionNotes: { at: string; by: string; note: string; ptpDate?: string }[];
  lastPaymentDate?: string;
  lastPaymentAmount?: number;
  /**
   * Unapplied money held against this account, in INTEGER PAISE. Absent/undefined
   * means zero — every existing record and every mock row is therefore valid
   * without a migration.
   *
   * A payment that cannot cover a whole instalment, or that overshoots the last
   * one, leaves the difference here rather than dropping it; the next payment
   * picks it up automatically. See docs/PAYMENT_LOGIC_DECISIONS.md.
   */
  advanceBalancePaise?: number;
  /** Balanced breakdown of the most recent payment (integer paise). */
  lastAllocation?: PaymentAllocation;
  branch: string;
  schedule: EmiRow[];
  /**
   * Live e-NACH mandate for this account. Undefined = the server did not send one
   * (older payload, or the mandate module is unreachable) — which is NOT the same
   * as "no mandate exists", so the UI must say "unknown" rather than "not set up".
   */
  mandate?: LoanMandate;
  /** Set only on accounts brought over by the legacy-book migration. */
  migratedFrom?: MigrationOrigin;
}

/** Provenance stamp written by the data migration. Absent on natively-originated loans. */
export interface MigrationOrigin {
  /** Legacy system the record came from, e.g. 'Finnone'. */
  system: string;
  legacyLoanNumber: string;
  migratedOn: string;
  /** Migration run that carried this record — for tracing a bad batch. */
  batchRef?: string;
}

// ─── e-NACH mandates & recurring debits ─────────────────────────────────────

export type MandateStatus =
  | 'ACTIVE'
  | 'PENDING'
  | 'PAUSED'
  | 'CANCELLED'
  | 'FAILED'
  | 'EXPIRED'
  | 'NOT_SETUP';

export interface LoanMandate {
  /** Unique Mandate Reference Number issued by NPCI. Absent until registration completes. */
  umrn?: string;
  status: MandateStatus;
  bankName: string;
  accountMasked: string;
  ifsc?: string;
  /** Ceiling the mandate authorises per debit. */
  maxAmount: number;
  /** Day of month the debit is presented. */
  debitDay?: number;
  registeredOn?: string;
  validTill?: string;
  lastDebitOn?: string;
  lastDebitStatus?: 'SUCCESS' | 'FAILED' | 'PENDING';
  /** NPCI return reason on the last failed presentation. */
  failureReason?: string;
  /** Consecutive failed presentations — the signal for "this mandate is dying". */
  consecutiveFailures: number;
}

export type NachItemStatus = 'SUCCESS' | 'FAILED' | 'RETRYING' | 'PENDING';

/** One EMI presented in a NACH batch. */
export interface NachDebitItem {
  id: string;
  batchId: string;
  loanNumber: string;
  customerName: string;
  loanType: LoanType;
  umrn?: string;
  bankName: string;
  emiSeq?: number;
  amount: number;
  status: NachItemStatus;
  /** NPCI return code on failure, e.g. '02' insufficient funds. */
  returnCode?: string;
  returnReason?: string;
  /** 1 = first presentation; >1 = a retry. */
  attempt: number;
  utr?: string;
  nextRetryOn?: string;
  presentedAt: string;
}

export interface NachBatch {
  id: string;
  presentationDate: string;
  cycle: 'PRESENTATION' | 'RETRY';
  status: 'COMPLETED' | 'RUNNING' | 'PARTIAL' | 'SCHEDULED';
  sponsorBank: string;
  fileRef: string;
  totalCount: number;
  totalAmount: number;
  successCount: number;
  successAmount: number;
  failedCount: number;
  failedAmount: number;
  retryingCount: number;
  pendingCount: number;
  startedAt: string;
  completedAt?: string;
}

export type ReconStatus =
  /** Book and bank agree. */
  | 'MATCHED'
  /** LMS recorded it; the bank file has no matching credit. */
  | 'UNMATCHED_IN_BOOK'
  /** The bank credited us; nothing in the book claims it. */
  | 'UNMATCHED_IN_BANK'
  /** Both sides have the txn, the amounts differ. */
  | 'AMOUNT_MISMATCH';

export interface ReconciliationRow {
  id: string;
  date: string;
  loanNumber?: string;
  customerName?: string;
  channel: Repayment['mode'];
  reference: string;
  /** What the LMS ledger says. */
  bookAmount: number;
  /** What the bank/NPCI settlement file says. */
  bankAmount: number;
  status: ReconStatus;
  note?: string;
}

// ─── Platform ───────────────────────────────────────────────────────────────

export interface PortalUser {
  id: string;
  name: string;
  phone: string;
  email: string;
  branch: string;
  role: Role;
  status: 'ACTIVE' | 'INACTIVE';
  lastLoginAt?: string;
  createdAt: string;
}

export interface Branch {
  id: string;
  code: string;
  name: string;
  city: string;
  state: string;
  address: string;
  manager: string;
  phone: string;
  products: LoanType[];
  openedOn: string;
  status: 'ACTIVE' | 'INACTIVE';
}

export interface Agent {
  id: string;
  code: string; // e.g. FSA-021
  name: string;
  phone: string;
  email: string;
  branch: string;
  territory: string;
  products: LoanType[];
  commissionRate: number; // % of disbursed value
  status: 'ACTIVE' | 'INACTIVE';
  joinedOn: string;
  sourced: number; // applications sourced
  disbursedValue: number; // ₹ converted to live loans
  commissionEarned: number; // ₹ paid to date
  commissionPending: number; // ₹ accrued, not yet paid
}

export interface ProductConfig {
  key: LoanType;
  product: string;
  minAmount: number;
  maxAmount: number;
  minRate: number; // % p.a.
  maxRate: number; // % p.a.
  maxTenure: number; // months
  processingFeePct: number;
  maxLtv?: number; // % — collateral products only (Gold, Housing)
  active: boolean;
}

export interface AuditLog {
  id: string;
  at: string;
  user: string;
  role: string;
  module: string;
  action: string;
  entity: string;
  oldValue?: string;
  newValue?: string;
  ip: string;
}

export interface AppNotification {
  id: string;
  title: string;
  description: string;
  at: string;
  read: boolean;
  type: 'application' | 'credit' | 'finance' | 'collection' | 'system';
}
