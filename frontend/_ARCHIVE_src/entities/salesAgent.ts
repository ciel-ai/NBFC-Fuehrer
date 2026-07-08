// Sales Team (loan-origination agent) domain types.
//
// These model net-new, agent-only concepts that have no customer-side
// equivalent: the agent profile, product-scoped login, FDO / retail-shop
// lookups, customer search, dashboard counts, and the save-as-draft envelope
// that lets an agent resume a half-filled application.
//
// Product-specific application payloads continue to reuse the existing loan
// entities (consumerDurableLoan.ts, goldLoan.ts, housingLoan.ts).

import type { SalesRole } from './auth';

/** The three loan-origination systems an agent can run. */
export type SalesProduct = 'cdl' | 'gold' | 'housing';

export const SALES_PRODUCTS: SalesProduct[] = ['cdl', 'gold', 'housing'];

export const SALES_PRODUCT_LABELS: Record<SalesProduct, string> = {
  cdl: 'Consumer Durable Loan',
  gold: 'Gold Loan',
  housing: 'Affordable Housing Loan',
};

export const SALES_PRODUCT_SHORT: Record<SalesProduct, string> = {
  cdl: 'CDL',
  gold: 'GL',
  housing: 'AHL',
};

/**
 * Maps a granular SALES_* role onto the loan-origination product it operates.
 * The role suffix matches the product key 1:1 (sales_cdl → cdl, etc.), so a
 * sales agent only ever sees their product's dashboard/config.
 */
export function salesRoleToProduct(role: SalesRole): SalesProduct {
  return role.slice('sales_'.length) as SalesProduct;
}

/** Authenticated agent profile returned by the login service. */
export interface SalesAgent {
  id: string;
  employeeId: string;
  name: string;
  email?: string;
  phone?: string;
  product: SalesProduct;
  branch: string;
  /** Field Disbursal Officer code — pre-fills the CDL FDO step. */
  fdoCode?: string;
  designation?: string;
}

/** FDO master-data lookup used to validate / pre-fill the CDL FDO step. */
export interface FdoDetails {
  fdoCode: string;
  fdoName: string;
  branch: string;
  region: string;
}

/** Retail-shop master-data lookup (CDL FDO step). */
export interface RetailShop {
  shopCode: string;
  shopName: string;
  city: string;
  branch: string;
}

/** A customer matched by the "Search Customer" feature. */
export interface CustomerSearchResult {
  id: string;
  name: string;
  phone: string;
  maskedPan?: string;
  /** Existing application/draft id, if this customer already has one in flight. */
  applicationId?: string;
  product: SalesProduct;
}

/**
 * Application lifecycle status. The dashboard tiles aggregate counts over
 * these, and the Badge status pills colour-code them. Status names differ
 * slightly per product (e.g. valuation/site-visit) but map onto this union.
 */
export type SalesApplicationStatus =
  | 'draft'
  | 'submitted'
  | 'in_review'
  | 'site_visit_pending'
  | 'valuation_pending'
  | 'approved'
  | 'rejected'
  | 'disbursed';

export interface SalesApplicationSummary {
  applicationId: string;
  product: SalesProduct;
  customerName: string;
  amount?: number;
  status: SalesApplicationStatus;
  updatedAt: string;
}

/** Counts shown on a product dashboard. Keyed by the tiles that product defines. */
export type DashboardCounts = Partial<Record<SalesApplicationStatus, number>> & {
  /** Locally-held, not-yet-submitted drafts (computed from the store, merged in). */
  draft?: number;
};

/**
 * Save-as-draft envelope. `data` is the partial form payload collected so far
 * (a flat record keyed by field name, matching the wizard configs), kept
 * deliberately loose so one envelope serves all three products.
 */
export interface SalesDraft {
  id: string;
  product: SalesProduct;
  /** Index of the furthest step the agent reached (for resume). */
  stepIndex: number;
  /** Flat field map of everything captured so far. */
  data: Record<string, unknown>;
  /** Best-effort label for the drafts list (derived from the applicant name). */
  label: string;
  createdAt: number;
  updatedAt: number;
}

/** A queued, not-yet-synced submission captured while offline. */
export interface SalesOfflineMutation {
  id: string;
  product: SalesProduct;
  data: Record<string, unknown>;
  queuedAt: number;
}

export interface SalesSubmitResult {
  applicationId: string;
  status: SalesApplicationStatus;
  product: SalesProduct;
  submittedAt: string;
}
