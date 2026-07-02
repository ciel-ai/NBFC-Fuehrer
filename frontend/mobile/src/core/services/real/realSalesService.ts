import api from '../../api/api';
import type { ISalesService } from '../interfaces/ISalesService';
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

// Real implementation — endpoints stubbed against the planned sales API.
// Never exercised while USE_MOCK=true; present so the USE_MOCK switch compiles
// both paths.
export const realSalesService: ISalesService = {
  async lookupFdo(fdoCode: string): Promise<FdoDetails> {
    const response = await api.get<FdoDetails>(`/sales/fdo/${encodeURIComponent(fdoCode)}`);
    return response.data;
  },

  async lookupRetailShop(shopCode: string): Promise<RetailShop> {
    const response = await api.get<RetailShop>(`/sales/retail-shop/${encodeURIComponent(shopCode)}`);
    return response.data;
  },

  async searchCustomer(query: string): Promise<CustomerSearchResult[]> {
    const response = await api.get<CustomerSearchResult[]>('/sales/customers/search', {
      params: { q: query },
    });
    return response.data;
  },

  async getDashboardCounts(product: SalesProduct): Promise<DashboardCounts> {
    const response = await api.get<DashboardCounts>(`/sales/${product}/dashboard/counts`);
    return response.data;
  },

  async listApplications(
    product: SalesProduct,
    status: SalesApplicationStatus,
  ): Promise<SalesApplicationSummary[]> {
    const response = await api.get<SalesApplicationSummary[]>(`/sales/${product}/applications`, {
      params: { status },
    });
    return response.data;
  },

  async submitApplication(
    product: SalesProduct,
    data: Record<string, unknown>,
  ): Promise<SalesSubmitResult> {
    const response = await api.post<SalesSubmitResult>(`/sales/${product}/applications`, data);
    return response.data;
  },
};
