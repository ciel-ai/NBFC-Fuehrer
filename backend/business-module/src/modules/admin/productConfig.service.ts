// src/modules/admin/productConfig.service.ts
//
// Reads and manages product configuration from loan_products table.
// Services (goldLoans, housingLoans, loans) should call getProductConfig()
// instead of using hardcoded constants.

import { prisma } from '@/config/database';
import { createModuleLogger } from '@/config/logger';

const log = createModuleLogger('productConfig.service');

// ─── In-memory cache (5 minute TTL) ──────────────────────────────────────────

interface ConfigCache {
    data: Map<string, any>;
    loadedAt: number;
}

let cache: ConfigCache | null = null;
const CACHE_TTL_MS = 5 * 60 * 1000;

async function getCache(): Promise<ConfigCache> {
    if (!cache || Date.now() - cache.loadedAt > CACHE_TTL_MS) {
        const rows = await prisma.loan_products.findMany({
            where: { is_active: true },
        });
        const data = new Map<string, any>();
        for (const row of rows) {
            data.set(row.product_type, row);
        }
        cache = { data, loadedAt: Date.now() };
        log.info('Product config cache loaded', { products: rows.length });
    }
    return cache!;
}

export function invalidateProductConfigCache(): void {
    cache = null;
    log.info('Product config cache invalidated');
}

// ─── Service ──────────────────────────────────────────────────────────────────

export const productConfigService = {

    async getProductConfig(productType: string) {
        const c = await getCache();
        const config = c.data.get(productType);
        if (!config) throw new Error(`Product config not found: ${productType}`);
        return {
            productType:      config.product_type,
            minAmount:        Number(config.min_amount),
            maxAmount:        Number(config.max_amount),
            minRate:          Number(config.min_rate),
            maxRate:          Number(config.max_rate),
            maxTenureMonths:  config.max_tenure_months,
            processingFeePct: Number(config.processing_fee_pct),
            insurancePct:     Number(config.insurance_pct),
            stampDuty:        Number(config.stamp_duty),
            documentationFee: Number(config.documentation_fee),
            maxLtvPct:        config.max_ltv_pct ? Number(config.max_ltv_pct) : null,
            isActive:         config.is_active,
            updatedAt:        config.updated_at,
        };
    },

    async getAllProductConfigs() {
        const rows = await prisma.loan_products.findMany({
            orderBy: { product_type: 'asc' },
        });
        return rows.map(r => ({
            productType:      r.product_type,
            minAmount:        Number(r.min_amount),
            maxAmount:        Number(r.max_amount),
            minRate:          Number(r.min_rate),
            maxRate:          Number(r.max_rate),
            maxTenureMonths:  r.max_tenure_months,
            processingFeePct: Number(r.processing_fee_pct),
            insurancePct:     Number(r.insurance_pct),
            stampDuty:        Number(r.stamp_duty),
            documentationFee: Number(r.documentation_fee),
            maxLtvPct:        r.max_ltv_pct ? Number(r.max_ltv_pct) : null,
            isActive:         r.is_active,
            updatedAt:        r.updated_at,
        }));
    },

    async updateProductConfig(
        productType: string,
        data: {
            minAmount?:        number;
            maxAmount?:        number;
            minRate?:          number;
            maxRate?:          number;
            maxTenureMonths?:  number;
            processingFeePct?: number;
            insurancePct?:     number;
            stampDuty?:        number;
            documentationFee?: number;
            maxLtvPct?:        number | null;
            isActive?:         boolean;
        },
    ) {
        const result = await prisma.loan_products.update({
            where: { product_type: productType },
            data: {
                ...(data.minAmount        !== undefined && { min_amount:         data.minAmount }),
                ...(data.maxAmount        !== undefined && { max_amount:         data.maxAmount }),
                ...(data.minRate          !== undefined && { min_rate:           data.minRate }),
                ...(data.maxRate          !== undefined && { max_rate:           data.maxRate }),
                ...(data.maxTenureMonths  !== undefined && { max_tenure_months:  data.maxTenureMonths }),
                ...(data.processingFeePct !== undefined && { processing_fee_pct: data.processingFeePct }),
                ...(data.insurancePct     !== undefined && { insurance_pct:      data.insurancePct }),
                ...(data.stampDuty        !== undefined && { stamp_duty:         data.stampDuty }),
                ...(data.documentationFee !== undefined && { documentation_fee:  data.documentationFee }),
                ...(data.maxLtvPct        !== undefined && { max_ltv_pct:        data.maxLtvPct }),
                ...(data.isActive         !== undefined && { is_active:          data.isActive }),
                updated_at: new Date(),
            },
        });

        invalidateProductConfigCache();

        log.info('Product config updated', { productType, changes: Object.keys(data) });

        return result;
    },
};