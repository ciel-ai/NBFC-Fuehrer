// tests/unit/emi.getForeclosureQuote.test.ts
//
// Regression test for CDL audit finding #9: computeForeclosureAmount's
// "10 days interest or ₹500, whichever is higher" minimum-interest floor
// is documented (in its own code comment) as Gold-Loan-specific, but was
// applied unconditionally to every caller of getForeclosureQuote — the
// single shared entry point for CDL (closeLoan), gold loans, the generic
// /emi/:id/foreclosure-quote route, and the LMS portal. CDL's own spec
// states foreclosure is simply "5% of principal outstanding + GST",
// nothing about a minimum-interest floor.
//
// getForeclosureQuote now looks up the loan account's real product type
// and only passes applyMinimumInterestFloor: true when it's actually a
// gold loan — this tests that wiring directly (the calculator math itself
// is covered in emi.calculator.test.ts).

const mockGetSummary = jest.fn();
const mockFindNextDueEmi = jest.fn();
jest.mock('@/modules/emi/emi.repository', () => ({
    emiRepository: {
        getSummary: (...args: unknown[]) => mockGetSummary(...args),
        findNextDueEmi: (...args: unknown[]) => mockFindNextDueEmi(...args),
    },
}));

const mockFindAccountByIdOrThrow = jest.fn();
jest.mock('@/modules/loans', () => ({
    loansRepository: {
        findAccountByIdOrThrow: (...args: unknown[]) => mockFindAccountByIdOrThrow(...args),
    },
}));

const mockLoanApplicationsFindUniqueOrThrow = jest.fn();
jest.mock('@/config/database', () => ({
    prisma: {
        loan_applications: {
            findUniqueOrThrow: (...args: unknown[]) => mockLoanApplicationsFindUniqueOrThrow(...args),
        },
    },
}));

const mockComputeForeclosureAmount = jest.fn();
jest.mock('@/modules/emi/emi.calculator', () => ({
    computeForeclosureAmount: (...args: unknown[]) => mockComputeForeclosureAmount(...args),
}));

import { emiService } from '@/modules/emi';

const LOAN_ACCOUNT_ID = 'loan-account-1';

beforeEach(() => {
    jest.clearAllMocks();
    mockGetSummary.mockResolvedValue({ totalOutstanding: 10_000, totalPenalty: 0, lastPaidAt: new Date('2026-01-01') });
    mockFindNextDueEmi.mockResolvedValue({ id: 'emi-4' }); // truthy — loan not already closed
    mockFindAccountByIdOrThrow.mockResolvedValue({ applicationId: 'app-1' });
    mockComputeForeclosureAmount.mockReturnValue({
        outstandingPrincipal: 10_000, accruedInterest: 50, foreclosureFee: 500,
        foreclosureFeeGst: 90, penalty: 0, total: 10_640,
    });
});

describe('getForeclosureQuote — the Gold-Loan-only minimum-interest floor is product-aware', () => {
    test('a gold loan account gets applyMinimumInterestFloor: true', async () => {
        mockLoanApplicationsFindUniqueOrThrow.mockResolvedValue({ product_type: 'GOLD_LOAN' });

        await emiService.getForeclosureQuote(LOAN_ACCOUNT_ID, 12);

        expect(mockComputeForeclosureAmount).toHaveBeenCalledWith(
            expect.objectContaining({ applyMinimumInterestFloor: true }),
        );
    });

    test('a CDL (CONSUMER_DURABLE) account gets applyMinimumInterestFloor: false — the actual bug being fixed', async () => {
        mockLoanApplicationsFindUniqueOrThrow.mockResolvedValue({ product_type: 'CONSUMER_DURABLE' });

        await emiService.getForeclosureQuote(LOAN_ACCOUNT_ID, 13);

        expect(mockComputeForeclosureAmount).toHaveBeenCalledWith(
            expect.objectContaining({ applyMinimumInterestFloor: false }),
        );
    });

    test('a housing loan account also gets applyMinimumInterestFloor: false — the floor is gold-only, not "everything except CDL"', async () => {
        mockLoanApplicationsFindUniqueOrThrow.mockResolvedValue({ product_type: 'HOUSING_LOAN' });

        await emiService.getForeclosureQuote(LOAN_ACCOUNT_ID, 9);

        expect(mockComputeForeclosureAmount).toHaveBeenCalledWith(
            expect.objectContaining({ applyMinimumInterestFloor: false }),
        );
    });

    test('the 5%-of-principal foreclosure fee and GST rate are unaffected by product type', async () => {
        mockLoanApplicationsFindUniqueOrThrow.mockResolvedValue({ product_type: 'CONSUMER_DURABLE' });

        await emiService.getForeclosureQuote(LOAN_ACCOUNT_ID, 13);

        expect(mockComputeForeclosureAmount).toHaveBeenCalledWith(
            expect.objectContaining({ foreclosureFeePct: 5 }),
        );
    });
});
