// src/modules/sales/sales.types.ts

export type SalesProduct = 'gold' | 'housing' | 'cdl';
export type SalesApplicationStatus = 'DRAFT' | 'SUBMITTED' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED' | 'DISBURSED';

export interface FdoDetails {
    fdoCode: string;
    fdoName: string;
    branch: string;
    city: string;
    phone: string;
    active: boolean;
}

export interface RetailShop {
    shopCode: string;
    shopName: string;
    ownerName: string;
    city: string;
    address: string;
    phone: string;
    active: boolean;
    productCategories: string[];
}

export interface CustomerSearchResult {
    id: string;
    name: string;
    phone: string;
    pan: string | null;
    kycStatus: string;
    existingLoans: number;
}

export interface DashboardCounts {
    product: SalesProduct;
    total: number;
    draft: number;
    submitted: number;
    underReview: number;
    approved: number;
    rejected: number;
    disbursed: number;
}

export interface SalesApplicationSummary {
    applicationId: string;
    customerName: string;
    customerPhone: string;
    loanAmount: number;
    status: SalesApplicationStatus;
    product: SalesProduct;
    createdAt: string;
    updatedAt: string;
}

export interface SalesSubmitResult {
    /** The real loan_applications.id (UUID) — no longer a fabricated string. */
    applicationId: string;
    status: string;
    /** loan_applications.reference_number, generated when the row is created. */
    referenceId: string;
    message: string;
    createdAt: string;
}