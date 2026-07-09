import React from 'react';
import { Redirect } from 'expo-router';
import { SalesWizardScreen } from '@/src/features/sales/screens/SalesWizardScreen';
import { useSalesStore } from '@/src/store/salesStore';
import { usePermission } from '@/src/shared/hooks/useRBAC';
import type { SalesProduct } from '@/src/entities/salesAgent';

function useActiveSalesProduct(): SalesProduct {
  return useSalesStore((s) => s.product ?? s.agent?.product ?? 'cdl');
}

export default function NewSaleRoute() {
  const product = useActiveSalesProduct();
  // Permission-gated (Task 4.1) — not a role-string comparison. A signed-in
  // user whose role lacks sales.sale.create lands on the 403 screen instead
  // of silently opening the wizard.
  const canCreate = usePermission('sales.sale.create');

  if (!canCreate) return <Redirect href="/unauthorized" />;
  return <SalesWizardScreen product={product} />;
}
