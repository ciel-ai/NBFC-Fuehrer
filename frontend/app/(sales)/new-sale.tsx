import React from 'react';
import { SalesWizardScreen } from '@/src/features/sales/screens/SalesWizardScreen';
import { useSalesStore } from '@/src/store/salesStore';
import type { SalesProduct } from '@/src/entities/salesAgent';

function useActiveSalesProduct(): SalesProduct {
  return useSalesStore((s) => s.product ?? s.agent?.product ?? 'cdl');
}

export default function NewSaleRoute() {
  const product = useActiveSalesProduct();
  return <SalesWizardScreen product={product} />;
}
