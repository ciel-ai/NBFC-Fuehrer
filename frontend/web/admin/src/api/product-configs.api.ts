// src/api/product-configs.api.ts
import { apiClient } from './client';
import type { ProductConfig } from '../types';

export const productConfigsApi = {
  // Backend: PATCH /product-configs/:productType — updates rate bands, ticket
  // size, fees and LTV for a single product line (GOLD | CDL | HOUSING).
  update: async (productType: ProductConfig['key'], patch: Partial<ProductConfig>) => {
    const res = await apiClient.patch(`/product-configs/${productType}`, patch);
    return res.data;
  },
};
