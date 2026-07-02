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
  | 'ADMIN'
  | 'CREDIT_CDL'
  | 'CREDIT_GOLD'
  | 'CREDIT_HOUSING'
  | 'FINANCE_CDL'
  | 'FINANCE_GOLD'
  | 'FINANCE_HOUSING'
  // Sales roles are provisioned here by Admin but sign in only on the
  // React Native field app — the web dashboard rejects their login.
  | 'SALES_CDL'
  | 'SALES_GOLD'
  | 'SALES_HOUSING';

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
  netWeightGrams: number;
  grossWeightGrams: number;
  purityKarat: 18 | 20 | 22;
  ratePerGram: number;
  valuation: number;
  ltv: number; // %
  items: { description: string; weightGrams: number }[];
  valuedBy: string;
}

export interface PropertyDetails {
  type: 'Flat' | 'Independent House' | 'Plot + Construction' | 'Row House';
  address: string;
  marketValue: number;
  ltv: number; // %
  builder?: string;
  constructionStage?: string;
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
  branch: string;
  schedule: EmiRow[];
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
