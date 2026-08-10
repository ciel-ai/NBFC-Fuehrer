// tests/unit/cdlLoans.autoDebitDate.test.ts
//
// Regression test for CDL audit finding #5 (half-fix, by design — see the
// comment in cdlLoans.service.ts's disburseToMerchant for why the other
// half, EMI-date alignment, is deliberately left open pending the
// client's answer to spec section 1f "Loan Repayment Date: Clarification
// required").
//
// Before this fix: autoDebitDate was validated (must be one of
// CDL_AUTO_DEBIT_DATES — 4/7/12) by validateCdlLoanParams, then never
// referenced again — submitApplication's createApplication call didn't
// include it, so a customer's explicit choice was silently discarded.
// This asserts it's now actually written to
// loan_applications.preferred_debit_day.

const mockFindCustomerByUserId = jest.fn();
const mockCreateApplication = jest.fn();
const mockUpdateApplicationStatus = jest.fn();

jest.mock('@/modules/loans/loans.repository', () => ({
    loansRepository: {
        findCustomerByUserId: (...args: unknown[]) => mockFindCustomerByUserId(...args),
        createApplication: (...args: unknown[]) => mockCreateApplication(...args),
        updateApplicationStatus: (...args: unknown[]) => mockUpdateApplicationStatus(...args),
    },
}));

const mockLoanApplicationsUpdate = jest.fn();
jest.mock('@/config/database', () => ({
    prisma: {
        loan_applications: {
            update: (...args: unknown[]) => mockLoanApplicationsUpdate(...args),
        },
    },
}));

import { cdlLoansService } from '@/modules/cdlLoans/cdlLoans.service';

const USER_ID = 'user-1';

const baseInput = {
    productCategory: 'MOBILES_TABLETS' as const,
    productName: 'Smartphone XYZ',
    productPrice: 30000,
    downPayment: 5000,
    loanAmount: 25000,
    tenureMonths: 12,
    storeName: 'Mobile World',
    storeCity: 'Bengaluru',
    employmentType: 'SALARIED' as const,
    monthlyIncome: 60000,
};

beforeEach(() => {
    jest.clearAllMocks();
    mockFindCustomerByUserId.mockResolvedValue({ id: 'cust-1' });
    mockCreateApplication.mockResolvedValue({
        id: 'app-1', referenceNumber: 'FHR-2026-000001', appliedAt: new Date(),
    });
    mockUpdateApplicationStatus.mockResolvedValue({
        id: 'app-1', status: 'KYC_PENDING', referenceNumber: 'FHR-2026-000001', appliedAt: new Date(),
    });
    mockLoanApplicationsUpdate.mockResolvedValue({});
});

describe('submitApplication persists the customer\'s chosen auto-debit date', () => {
    test('a valid autoDebitDate (7th) is passed through to createApplication as preferredDebitDay', async () => {
        await cdlLoansService.submitApplication(USER_ID, { ...baseInput, autoDebitDate: 7 });

        expect(mockCreateApplication).toHaveBeenCalledWith(
            expect.objectContaining({ preferredDebitDay: 7 }),
        );
    });

    test('each of the three allowed dates (4th/7th/12th) is persisted correctly', async () => {
        for (const date of [4, 7, 12] as const) {
            jest.clearAllMocks();
            mockFindCustomerByUserId.mockResolvedValue({ id: 'cust-1' });
            mockCreateApplication.mockResolvedValue({ id: 'app-1', referenceNumber: 'FHR-2026-000001', appliedAt: new Date() });
            mockUpdateApplicationStatus.mockResolvedValue({ id: 'app-1', status: 'KYC_PENDING', referenceNumber: 'FHR-2026-000001', appliedAt: new Date() });

            await cdlLoansService.submitApplication(USER_ID, { ...baseInput, autoDebitDate: date });

            expect(mockCreateApplication).toHaveBeenCalledWith(
                expect.objectContaining({ preferredDebitDay: date }),
            );
        }
    });

    test('an application submitted without autoDebitDate passes undefined, not a fabricated default', async () => {
        await cdlLoansService.submitApplication(USER_ID, baseInput);

        expect(mockCreateApplication).toHaveBeenCalledWith(
            expect.objectContaining({ preferredDebitDay: undefined }),
        );
    });

    test('an out-of-range autoDebitDate is still rejected before reaching createApplication (validateCdlLoanParams unchanged)', async () => {
        await expect(
            cdlLoansService.submitApplication(USER_ID, { ...baseInput, autoDebitDate: 15 as any }),
        ).rejects.toThrow();
        expect(mockCreateApplication).not.toHaveBeenCalled();
    });
});
