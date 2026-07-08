import { mockDelay } from '../../api/api';
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

// ---------------------------------------------------------------------------
// Deterministic mock master-data + counts so every dashboard/screen renders
// with no backend (USE_MOCK=true).
// ---------------------------------------------------------------------------

const FDO_DIRECTORY: Record<string, FdoDetails> = {
  FDO0001: { fdoCode: 'FDO0001', fdoName: 'Ravi Sharma', branch: 'Bengaluru - Koramangala', region: 'South' },
  FDO0002: { fdoCode: 'FDO0002', fdoName: 'Anita Desai', branch: 'Mumbai - Andheri', region: 'West' },
};

const SHOP_DIRECTORY: Record<string, RetailShop> = {
  RS1001: { shopCode: 'RS1001', shopName: 'Sunrise Electronics', city: 'Bengaluru', branch: 'Bengaluru - Koramangala' },
  RS1002: { shopCode: 'RS1002', shopName: 'Galaxy Mobiles', city: 'Mumbai', branch: 'Mumbai - Andheri' },
};

const COUNTS: Record<SalesProduct, DashboardCounts> = {
  cdl: { submitted: 8, approved: 5, rejected: 2, disbursed: 4 },
  gold: { valuation_pending: 3, approved: 6, rejected: 1, disbursed: 5 },
  housing: { site_visit_pending: 2, in_review: 4, approved: 3, rejected: 1, disbursed: 2 },
};

function seedApplications(product: SalesProduct): SalesApplicationSummary[] {
  const names = ['Priya Nair', 'Imran Khan', 'Sunita Rao', 'Vikram Mehta', 'Deepa Iyer'];
  const statuses: SalesApplicationStatus[] =
    product === 'gold'
      ? ['valuation_pending', 'approved', 'disbursed', 'rejected', 'approved']
      : product === 'housing'
        ? ['site_visit_pending', 'in_review', 'approved', 'disbursed', 'rejected']
        : ['submitted', 'approved', 'disbursed', 'rejected', 'submitted'];

  return names.map((name, i) => ({
    applicationId: `${product.toUpperCase()}-${1000 + i}`,
    product,
    customerName: name,
    amount: 50000 + i * 25000,
    status: statuses[i],
    updatedAt: new Date(Date.now() - i * 86400000).toISOString(),
  }));
}

export const mockSalesService: ISalesService = {
  async lookupFdo(fdoCode: string): Promise<FdoDetails> {
    await mockDelay(null, 600);
    const code = fdoCode.trim().toUpperCase();
    const hit = FDO_DIRECTORY[code];
    if (hit) return hit;
    // Unknown but well-formed codes resolve to a generated record so the agent
    // is never hard-blocked in the field; truly invalid codes throw.
    if (/^FDO\d{4}$/.test(code)) {
      return { fdoCode: code, fdoName: 'Field Officer', branch: 'Head Office', region: 'Central' };
    }
    throw { code: 'FDO_NOT_FOUND', message: 'FDO code not recognised' };
  },

  async lookupRetailShop(shopCode: string): Promise<RetailShop> {
    await mockDelay(null, 600);
    const code = shopCode.trim().toUpperCase();
    const hit = SHOP_DIRECTORY[code];
    if (hit) return hit;
    if (/^RS\d{4}$/.test(code)) {
      return { shopCode: code, shopName: 'Retail Partner', city: 'City', branch: 'Head Office' };
    }
    throw { code: 'SHOP_NOT_FOUND', message: 'Retail shop code not recognised' };
  },

  async searchCustomer(query: string): Promise<CustomerSearchResult[]> {
    await mockDelay(null, 700);
    const q = query.trim().toLowerCase();
    if (q.length < 3) return [];
    const pool: CustomerSearchResult[] = [
      { id: 'cus_1', name: 'Priya Nair', phone: '+919800012345', maskedPan: 'ABCPN****K', product: 'cdl', applicationId: 'CDL-1000' },
      { id: 'cus_2', name: 'Imran Khan', phone: '+919800054321', maskedPan: 'XYZIK****M', product: 'gold' },
      { id: 'cus_3', name: 'Sunita Rao', phone: '+919811122233', maskedPan: 'LMNSR****P', product: 'housing', applicationId: 'AHL-1002' },
    ];
    return pool.filter(
      (c) => c.name.toLowerCase().includes(q) || c.phone.includes(q),
    );
  },

  async getDashboardCounts(product: SalesProduct): Promise<DashboardCounts> {
    await mockDelay(null, 600);
    return { ...COUNTS[product] };
  },

  async listApplications(
    product: SalesProduct,
    status: SalesApplicationStatus,
  ): Promise<SalesApplicationSummary[]> {
    await mockDelay(null, 700);
    return seedApplications(product).filter((a) => a.status === status);
  },

  async submitApplication(
    product: SalesProduct,
    _data: Record<string, unknown>,
  ): Promise<SalesSubmitResult> {
    await mockDelay(null, 1200);
    if (Math.random() < 0.1) {
      throw { code: 'SUBMIT_FAILED', message: 'Submission failed. Please retry.' };
    }
    return {
      applicationId: `${product.toUpperCase()}-${Math.floor(100000 + Math.random() * 900000)}`,
      status: 'submitted',
      product,
      submittedAt: new Date().toISOString(),
    };
  },
};
