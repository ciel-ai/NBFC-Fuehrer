// src/modules/sales/sales.service.ts
import { createModuleLogger } from '@/config/logger';
import type {
    SalesProduct, SalesApplicationStatus,
    FdoDetails, RetailShop,
    CustomerSearchResult, DashboardCounts,
    SalesApplicationSummary, SalesSubmitResult,
} from './sales.types';

const log = createModuleLogger('sales.service');

export const salesService = {

    lookupFdo(fdoCode: string): FdoDetails {
        log.debug('Looking up FDO', { fdoCode });
        return {
            fdoCode,
            fdoName: 'Rajesh Kumar',
            branch: 'Feuhrer NBFC — Goregaon',
            city: 'Mumbai',
            phone: '9876543210',
            active: true,
        };
    },

    lookupRetailShop(shopCode: string): RetailShop {
        log.debug('Looking up retail shop', { shopCode });
        return {
            shopCode,
            shopName: 'Croma Electronics',
            ownerName: 'Suresh Patel',
            city: 'Mumbai',
            address: 'Shop 12, Linking Road, Bandra',
            phone: '9876543211',
            active: true,
            productCategories: ['TV_APPLIANCES', 'MOBILES_TABLETS', 'LAPTOPS', 'AC'],
        };
    },

    searchCustomer(query: string): CustomerSearchResult[] {
        log.debug('Searching customer', { query });
        return [
            {
                id: 'usr_001',
                name: 'Rahul Sharma',
                phone: '9999999999',
                pan: 'ABCDE1234F',
                kycStatus: 'COMPLETED',
                existingLoans: 1,
            },
            {
                id: 'usr_002',
                name: 'Priya Singh',
                phone: '9888888888',
                pan: null,
                kycStatus: 'PENDING',
                existingLoans: 0,
            },
        ].filter(c => c.name.toLowerCase().includes(query.toLowerCase()) || c.phone.includes(query));
    },

    getDashboardCounts(product: SalesProduct): DashboardCounts {
        return {
            product,
            total: 24,
            draft: 3,
            submitted: 5,
            underReview: 8,
            approved: 6,
            rejected: 2,
            disbursed: 0,
        };
    },

    listApplications(product: SalesProduct, status: SalesApplicationStatus): SalesApplicationSummary[] {
        return [
            {
                applicationId: `${product}_app_001`,
                customerName: 'Rahul Sharma',
                customerPhone: '9999999999',
                loanAmount: product === 'gold' ? 135000 : product === 'housing' ? 2500000 : 50000,
                status,
                product,
                createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
                updatedAt: new Date().toISOString(),
            },
            {
                applicationId: `${product}_app_002`,
                customerName: 'Priya Singh',
                customerPhone: '9888888888',
                loanAmount: product === 'gold' ? 80000 : product === 'housing' ? 1500000 : 30000,
                status,
                product,
                createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
                updatedAt: new Date().toISOString(),
            },
        ];
    },

    submitApplication(product: SalesProduct, data: Record<string, unknown>): SalesSubmitResult {
        log.info('Sales submitting application', { product });
        const prefix = product === 'gold' ? 'GL' : product === 'housing' ? 'AHL' : 'CDL';
        return {
            applicationId: `${product}_app_${Date.now()}`,
            status: 'SUBMITTED',
            referenceId: `FHR-${prefix}-${Math.floor(100000 + Math.random() * 900000)}`,
            message: 'Application submitted successfully.',
            createdAt: new Date().toISOString(),
        };
    },
};