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