// src/modules/loans/loans.types.ts
import type { LoanStatus, ProductType, DisbursementMode } from '@/config/constants';
import type { Rupees, PaginationParams, SortOrder } from '@/types/common.types';

<<<<<<< HEAD
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
=======
// â”€â”€â”€ Core loan application model â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export interface LoanApplication {
    id: string;
    userId: string;
    agentId: string | null;
>>>>>>> origin/main
    status: LoanStatus;

    // Request details
    amountRequested: Rupees;
    tenureMonths: number;
    productType: ProductType;
    purpose: string;
    storeName: string;
    storeCity: string;

<<<<<<< HEAD
    // Income snapshot — stays on application for regulatory audit trail
=======
    // Address fields
    flatHouseNo: string | null;
    streetArea: string | null;
    city: string | null;
    pincode: string | null;
    state: string | null;

    // Employment fields
    employmentType: string | null;
    employerName: string | null;
>>>>>>> origin/main
    monthlyIncome: number | null;

    // Repayment
    repaymentType: string;

<<<<<<< HEAD
    // Approval details — populated by credit manager
    approvedAmount: Rupees | null;
    interestRate: number | null;
=======
    // Approval details â€” populated by credit manager
    approvedAmount: Rupees | null;
    interestRate: number | null;   // Annual % e.g. 18.00
>>>>>>> origin/main
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

<<<<<<< HEAD
// ─── Active loan account — created on disbursement ────────────────────────────
=======
// â”€â”€â”€ Active loan account â€” created on disbursement â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
>>>>>>> origin/main

export interface LoanAccount {
    id: string;
    applicationId: string;
    userId: string;
<<<<<<< HEAD
    accountNumber: string;
=======
    accountNumber: string;   // Human-readable: FHR-2026-000001
>>>>>>> origin/main

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

<<<<<<< HEAD
// ─── Input / output DTOs ───────────────────────────────────────────────────────
=======
// â”€â”€â”€ Input / output DTOs â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
>>>>>>> origin/main

export interface CreateLoanApplicationInput {
    userId: string;
    agentId: string | null;
    amount: Rupees;
    tenureMonths: number;
    productType: ProductType;
    purpose: string;
    storeName: string;
    storeCity: string;
<<<<<<< HEAD
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
=======

    // Address fields
    flatHouseNo: string | null;
    streetArea: string | null;
    city: string | null;
    pincode: string | null;
    state: string | null;

    // Employment fields
    employmentType: string | null;
    employerName: string | null;
    monthlyIncome: number | null;

    // Repayment
    repaymentType: string;
>>>>>>> origin/main
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

<<<<<<< HEAD
// ─── Safe public response shapes ──────────────────────────────────────────────
=======
// â”€â”€â”€ Safe public response shapes â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// What we expose through the API â€” no internal DB ids beyond what's necessary
>>>>>>> origin/main

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
<<<<<<< HEAD
    monthlyIncome: number | null;
=======

    // Address fields
    flatHouseNo: string | null;
    streetArea: string | null;
    city: string | null;
    pincode: string | null;
    state: string | null;

    // Employment fields
    employmentType: string | null;
    employerName: string | null;
    monthlyIncome: number | null;

    // Repayment
>>>>>>> origin/main
    repaymentType: string;
    rejectionReason: string | null;
    appliedAt: Date;
    updatedAt: Date;
    reviewedAt: Date | null;
<<<<<<< HEAD

    // Customer profile — joined from customers table
    customer: CustomerProfile | null;
=======
>>>>>>> origin/main
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

<<<<<<< HEAD
// ─── EMI preview — shown to customer before applying ──────────────────────────
=======
// â”€â”€â”€ EMI preview â€” shown to customer before applying â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
>>>>>>> origin/main

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
<<<<<<< HEAD
    effectiveRate: number;
}

// ─── Status transition metadata ───────────────────────────────────────────────
=======
    effectiveRate: number;   // APR
}

// â”€â”€â”€ Status transition metadata â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
>>>>>>> origin/main

export interface StatusTransitionResult {
    loanId: string;
    previousStatus: LoanStatus;
    currentStatus: LoanStatus;
    transitionedAt: Date;
<<<<<<< HEAD
}
=======
}

>>>>>>> origin/main
