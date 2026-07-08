import type { SalesProduct } from '@/src/entities/salesAgent';
import type { SalesProductConfig } from './types';
import { cdlConfig } from './cdlConfig';
import { goldConfig } from './goldConfig';
import { housingConfig } from './housingConfig';

const CONFIGS: Record<SalesProduct, SalesProductConfig> = {
  cdl: cdlConfig,
  gold: goldConfig,
  housing: housingConfig,
};

export function getProductConfig(product: SalesProduct): SalesProductConfig {
  return CONFIGS[product];
}

export const ALL_PRODUCT_CONFIGS: SalesProductConfig[] = [cdlConfig, goldConfig, housingConfig];

export * from './types';
