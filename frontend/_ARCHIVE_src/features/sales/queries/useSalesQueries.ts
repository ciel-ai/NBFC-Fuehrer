import { useQuery, useMutation } from '@tanstack/react-query';
import { useServices } from '@/src/core/services/ServiceProvider';
import { useSalesStore } from '@/src/store/salesStore';
import type {
  SalesApplicationStatus,
  SalesProduct,
} from '@/src/entities/salesAgent';

// ---------------------------------------------------------------------------
// Server-state hooks for the sales module. All read paths go through the
// service layer (mock or real, switched by USE_MOCK) — never fetch from a
// screen directly.
// ---------------------------------------------------------------------------

export const salesKeys = {
  counts: (product: SalesProduct) => ['sales', product, 'counts'] as const,
  list: (product: SalesProduct, status: SalesApplicationStatus) =>
    ['sales', product, 'applications', status] as const,
  customerSearch: (query: string) => ['sales', 'customer-search', query] as const,
};

/** Dashboard tile counts. Drafts are merged in from the local store. */
export function useDashboardCounts(product: SalesProduct) {
  const { salesService } = useServices();
  const draftCount = useSalesStore(
    (s) => Object.values(s.drafts).filter((d) => d.product === product).length,
  );

  const query = useQuery({
    queryKey: salesKeys.counts(product),
    queryFn: () => salesService.getDashboardCounts(product),
    staleTime: 30_000,
  });

  return {
    ...query,
    counts: { ...(query.data ?? {}), draft: draftCount },
  };
}

export function useApplicationList(
  product: SalesProduct,
  status: SalesApplicationStatus,
  enabled = true,
) {
  const { salesService } = useServices();
  return useQuery({
    queryKey: salesKeys.list(product, status),
    queryFn: () => salesService.listApplications(product, status),
    enabled,
  });
}

export function useCustomerSearch(query: string) {
  const { salesService } = useServices();
  return useQuery({
    queryKey: salesKeys.customerSearch(query),
    queryFn: () => salesService.searchCustomer(query),
    enabled: query.trim().length >= 3,
    staleTime: 10_000,
  });
}

/** On-demand FDO master-data lookup (CDL FDO step). */
export function useFdoLookup() {
  const { salesService } = useServices();
  return useMutation({
    mutationFn: (fdoCode: string) => salesService.lookupFdo(fdoCode),
  });
}

/** On-demand retail-shop master-data lookup (CDL FDO step). */
export function useRetailShopLookup() {
  const { salesService } = useServices();
  return useMutation({
    mutationFn: (shopCode: string) => salesService.lookupRetailShop(shopCode),
  });
}
