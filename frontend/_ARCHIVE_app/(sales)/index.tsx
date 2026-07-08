import React from 'react';
import { SalesDashboardScreen } from '@/src/features/sales/screens/SalesDashboardScreen';
import { useUserStore } from '@/src/store/userStore';
import { useSalesStore } from '@/src/store/salesStore';
import { isSalesRole } from '@/src/entities/auth';
import { salesRoleToProduct } from '@/src/entities/salesAgent';
import type { SalesProduct } from '@/src/entities/salesAgent';

export default function SalesDashboardRoute() {
  // The product is canonically derived from the agent's role (set at OTP
  // verify). The (sales) layout guard guarantees only sales roles reach here;
  // the sales-session product is a fallback for an unexpected null role.
  const role = useUserStore((s) => s.role);
  const fallbackProduct = useSalesStore((s) => s.product ?? s.agent?.product ?? 'cdl');
  const product: SalesProduct = isSalesRole(role)
    ? salesRoleToProduct(role)
    : fallbackProduct;

  return <SalesDashboardScreen product={product} />;
}
