import type {
  CustomerSearchResult,
  DashboardCounts,
  FdoDetails,
  RetailShop,
  SalesApplicationStatus,
  SalesApplicationSummary,
  SalesProduct,
  SalesSubmitResult,
} from '@/src/entities/salesAgent';

/**
 * Sales-only concerns that have no customer-side equivalent. Product-specific
 * LOS steps (KYC, credit, agreement, NACH, disbursal) continue to flow through
 * the existing I{ConsumerDurable,Gold,Housing}LoanService methods.
 */
export interface ISalesService {
  /** Validate / pre-fill an FDO code (CDL FDO step). */
  lookupFdo(fdoCode: string): Promise<FdoDetails>;
  /** Validate / pre-fill a retail-shop code (CDL FDO step). */
  lookupRetailShop(shopCode: string): Promise<RetailShop>;
  /** Free-text customer search (name / phone / PAN). */
  searchCustomer(query: string): Promise<CustomerSearchResult[]>;
  /** Aggregate counts for the product dashboard tiles. */
  getDashboardCounts(product: SalesProduct): Promise<DashboardCounts>;
  /** List applications in a given lifecycle status (tile drill-down). */
  listApplications(
    product: SalesProduct,
    status: SalesApplicationStatus,
  ): Promise<SalesApplicationSummary[]>;
  /** Final submit of a completed application. */
  submitApplication(
    product: SalesProduct,
    data: Record<string, unknown>,
  ): Promise<SalesSubmitResult>;
}
