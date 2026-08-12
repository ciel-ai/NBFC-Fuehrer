// src/modules/loans/loans.types.ts
import type { LoanStatus, ProductType, DisbursementMode } from '@/config/constants';
import type { Rupees, PaginationParams, SortOrder } from '@/types/common.types';

// ─── Customer profile ──────────────────────────────────────────────────────────

export interface CustomerProfile {
    id: string;
    userId: string;
    flatHouseNo: string | null;
    streetArea: string | null;
    city: string | null;
    state: string | null;
    pincode: string | null;
    employmentType: string | null;
    employerName: string | null;
    createdAt: Date;
    updatedAt: Date;
}

export interface UpsertCustomerInput {
    userId: string;
    flatHouseNo?: string | null;
    streetArea?: string | null;
    city?: string | null;
    state?: string | null;
    pincode?: string | null;
    employmentType?: string | null;
    employerName?: string | null;
}

// ─── Core loan application model ───────────────────────────────────────────────

export interface LoanApplication {
    id: string;
    referenceNumber: string | null;
    userId: string;
    agentId: string | null;
    customerId: string | null;
    customer?: CustomerProfile | null;
    status: LoanStatus;

    // Request details
    amountRequested: Rupees;
    tenureMonths: number;
    productType: ProductType;
    purpose: string;
    storeName: string;
    storeCity: string;

    // Income snapshot — stays on application for regulatory audit trail
    monthlyIncome: number | null;

    // Repayment
    repaymentType: string;
    // Customer's chosen auto-debit day of month (CDL: 4th/7th/12th only —
    // see cdlLoans.service.ts's CDL_AUTO_DEBIT_DATES). Optional — gold/
    // housing loans don't use this concept and never set it, leaving the
    // DB default (loan_applications.preferred_debit_day, @default(4)) in
    // place. Persisted so it's not silently discarded, but NOT YET wired
    // into EMI schedule date generation — see the comment in
    // cdlLoans.service.ts's disburseToMerchant for why (client spec
    // section 1f explicitly flags loan repayment date configuration as
    // "clarification required", not yet a settled policy to implement).
    preferredDebitDay?: number | null;

    // ── Consumer-durable product details ──────────────────────────────────
    // Only CDL applications populate these; gold and housing finance no
    // product and leave them null. productValue is the item's invoice value,
    // NOT the principal — amountRequested = productValue - downPayment.
    // See migration 20260813000000_add_cdl_product_fields.
    /**
     * The financed item, as typed by the customer. Distinct from `purpose`:
     * that is the generic loan-purpose field shared with gold and housing.
     * CDL writes both (purpose for backward compatibility with the admin list
     * and CAM document, productName as the real field).
     */
    productName?: string | null;
    productValue?: Rupees | null;
    downPayment?: Rupees | null;
    productCategory?: string | null;
    /**
     * CDL only — the employment type used to determine the permitted
     * interest-rate set at submission, and the authoritative value for all
     * downstream CDL processing from that point on (credit assessment,
     * auto-approval). NOT the same field as `customer.employmentType` below
     * — that is a general, mutable profile fact that can predate or outlive
     * any single application; this is a per-application snapshot of what
     * was true and used for underwriting when THIS application was filed.
     * Null for gold/housing (which never set it) and for CDL applications
     * submitted before this column existed.
     */
    employmentType?: 'SALARIED' | 'SELF_EMPLOYED' | null;

    // Approval details — populated by credit manager
    approvedAmount: Rupees | null;
    interestRate: number | null;
    processingFee: Rupees | null;
    processingFeeGst: Rupees | null;

    // Decision details
    rejectionReason: string | null;
    reviewedBy: string | null;
    reviewedAt: Date | null;

    // Timestamps
    appliedAt: Date;
    updatedAt: Date;
}

// ─── Active loan account — created on disbursement ────────────────────────────

export interface LoanAccount {
    id: string;
    applicationId: string;
    userId: string;
    accountNumber: string;

    principalAmount: Rupees;
    interestRate: number;
    tenureMonths: number;
    monthlyEmi: Rupees;
    outstandingBalance: Rupees;
    totalInterest: Rupees;

    status: LoanStatus;
    repaymentMode: DisbursementMode;
    razorpayMandateId: string | null;

    disbursedAt: Date | null;
    closedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
}

// ─── Input / output DTOs ───────────────────────────────────────────────────────

export interface CreateLoanApplicationInput {
    userId: string;
    agentId: string | null;
    amount: Rupees;
    tenureMonths: number;
    productType: ProductType;
    purpose: string;
    storeName: string;
    storeCity: string;
    monthlyIncome: number | null;
    repaymentType: string;

    // Customer profile fields — upserted to customers table
    flatHouseNo?: string | null;
    streetArea?: string | null;
    city?: string | null;
    state?: string | null;
    pincode?: string | null;
    employmentType?: string | null;
    employerName?: string | null;
}

export interface SubmitLoanApplicationInput {
    loanId: string;
    userId: string;
}

export interface ApproveLoanInput {
    loanId: string;
    approvedBy: string;
    approvedAmount: Rupees;
    interestRate: number;
    processingFee: Rupees;
}

export interface RejectLoanInput {
    loanId: string;
    rejectedBy: string;
    reason: string;
}

export interface ListLoansInput extends PaginationParams {
    userId?: string;
    agentId?: string;
    status?: LoanStatus;
    productType?: ProductType;
    sortBy?: 'appliedAt' | 'amount' | 'updatedAt';
    sortOrder?: SortOrder;
    fromDate?: Date;
    toDate?: Date;
}

// ─── Safe public response shapes ──────────────────────────────────────────────

export interface LoanApplicationResponse {
    id: string;
    referenceNumber: string | null;
    status: LoanStatus;
    amountRequested: Rupees;
    approvedAmount: Rupees | null;
    tenureMonths: number;
    interestRate: number | null;
    monthlyEmi: Rupees | null;
    processingFee: Rupees | null;
    productType: ProductType;
    purpose: string;
    // CDL product details — null for gold/housing.
    productName: string | null;
    productValue: Rupees | null;
    downPayment: Rupees | null;
    /** CDL only — see LoanApplication.employmentType's own comment. */
    employmentType: 'SALARIED' | 'SELF_EMPLOYED' | null;
    storeName: string;
    storeCity: string;
    monthlyIncome: number | null;
    repaymentType: string;
    rejectionReason: string | null;
    appliedAt: Date;
    updatedAt: Date;
    reviewedAt: Date | null;

    // Customer profile — joined from customers table
    customer: CustomerProfile | null;
}

export interface LoanAccountResponse {
    id: string;
    accountNumber: string;
    principalAmount: Rupees;
    interestRate: number;
    tenureMonths: number;
    monthlyEmi: Rupees;
    outstandingBalance: Rupees;
    totalInterest: Rupees;
    status: LoanStatus;
    disbursedAt: Date | null;
    closedAt: Date | null;
}

// ─── EMI preview — shown to customer before applying ──────────────────────────

export interface EmiPreviewInput {
    amount: Rupees;
    tenureMonths: number;
    interestRate: number;
}

export interface EmiPreviewResult {
    monthlyEmi: Rupees;
    totalAmount: Rupees;
    totalInterest: Rupees;
    processingFee: Rupees;
    effectiveRate: number;
}

// ─── Status transition metadata ───────────────────────────────────────────────

export interface StatusTransitionResult {
    loanId: string;
    previousStatus: LoanStatus;
    currentStatus: LoanStatus;
    transitionedAt: Date;
}