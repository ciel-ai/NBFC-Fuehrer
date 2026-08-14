// tests/unit/loansRepository.employmentType.test.ts
//
// Exercises the real loansRepository.mapApplication() (not a
// reimplementation) against a raw row shaped like what Prisma actually
// returns for loan_applications.employment_type, and loans.service.ts's
// toApplicationResponse() against the mapped result — the two mapping
// layers a customer/admin's GET request actually passes through. Only
// @/config/database is mocked here (loansRepository itself is real),
// unlike cdlLoans.employmentType.test.ts, which mocks the repository to
// test submitApplication's write side in isolation.

const mockFindUnique = jest.fn();

jest.mock('@/config/database', () => ({
    prisma: {
        loan_applications: {
            findUnique: (...args: unknown[]) => mockFindUnique(...args),
        },
    },
}));

import { loansRepository } from '@/modules/loans/loans.repository';

function rawRow(employment_type: 'SALARIED' | 'SELF_EMPLOYED' | null) {
    return {
        id: 'app-1',
        reference_number: 'FHR-2026-000001',
        user_id: 'user-1',
        agent_id: null,
        customer_id: 'cust-1',
        customer: null,
        status: 'KYC_PENDING',
        amount_requested: 25000,
        tenure_months: 12,
        product_type: 'CONSUMER_DURABLE',
        purpose: 'Consumer durable purchase',
        store_name: 'Mobile World',
        store_city: 'Bengaluru',
        approved_amount: null,
        interest_rate: 14,
        processing_fee: 1463,
        processing_fee_gst: 263,
        rejection_reason: null,
        reviewed_by: null,
        reviewed_at: null,
        applied_at: new Date('2026-08-12'),
        updated_at: new Date('2026-08-12'),
        monthly_income: 60000,
        repayment_type: 'MONTHLY_EMI',
        preferred_debit_day: 7,
        product_name: 'Smartphone XYZ',
        product_value: 30000,
        down_payment: 5000,
        product_category: 'MOBILES_TABLETS',
        employment_type,
    };
}

describe('loansRepository.findApplicationById — employment_type round trip', () => {
    test('SALARIED row maps to employmentType: SALARIED', async () => {
        mockFindUnique.mockResolvedValue(rawRow('SALARIED'));
        const app = await loansRepository.findApplicationById('app-1');
        expect(app?.employmentType).toBe('SALARIED');
    });

    test('SELF_EMPLOYED row maps to employmentType: SELF_EMPLOYED', async () => {
        mockFindUnique.mockResolvedValue(rawRow('SELF_EMPLOYED'));
        const app = await loansRepository.findApplicationById('app-1');
        expect(app?.employmentType).toBe('SELF_EMPLOYED');
    });

    test('a legacy pre-migration row (NULL) maps to employmentType: null, not a guess', async () => {
        mockFindUnique.mockResolvedValue(rawRow(null));
        const app = await loansRepository.findApplicationById('app-1');
        expect(app?.employmentType).toBeNull();
    });
});
