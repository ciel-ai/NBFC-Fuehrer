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
const mockHasActiveApplication = jest.fn();

jest.mock('@/modules/loans/loans.repository', () => ({
    loansRepository: {
        findCustomerByUserId: (...args: unknown[]) => mockFindCustomerByUserId(...args),
        createApplication: (...args: unknown[]) => mockCreateApplication(...args),
        updateApplicationStatus: (...args: unknown[]) => mockUpdateApplicationStatus(...args),
        hasActiveApplication: (...args: unknown[]) => mockHasActiveApplication(...args),
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
    mockHasActiveApplication.mockResolvedValue(false);
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

// Regression test for CDL audit finding #12: a customer could previously
// submit unlimited simultaneous CDL applications — submitApplication
// never checked loansRepository.hasActiveApplication before creating a
// new one, unlike the generic loans.service.ts, which already did.
describe('submitApplication — duplicate-active-application guard (audit finding #12)', () => {
    // loansRepository.hasActiveApplication is mocked wholesale here (same
    // pattern every other test in this file already uses) — it already
    // decides what counts as "active" (anything NOT REJECTED/CLOSED/
    // WRITTEN_OFF — e.g. DRAFT, KYC_PENDING, UNDERWRITING, APPROVED,
    // DISBURSED, ACTIVE) via loans.repository.ts's own status exclusion
    // list, untouched by this fix. What's actually being tested here is
    // that submitApplication honors that boolean at all — it previously
    // never called this function, so it made no difference what it would
    // have returned.
    test('throws (does not reach createApplication) when the user has any live application — e.g. UNDERWRITING or APPROVED, not just DRAFT', async () => {
        mockHasActiveApplication.mockResolvedValue(true);

        await expect(
            cdlLoansService.submitApplication(USER_ID, baseInput),
        ).rejects.toThrow('An active loan application already exists for this user');
        expect(mockCreateApplication).not.toHaveBeenCalled();
    });

    test('succeeds when the user has zero prior applications (baseline)', async () => {
        mockHasActiveApplication.mockResolvedValue(false);

        await expect(
            cdlLoansService.submitApplication(USER_ID, baseInput),
        ).resolves.toBeDefined();
        expect(mockCreateApplication).toHaveBeenCalledTimes(1);
    });

    test('succeeds when the user\'s only prior application is REJECTED/CLOSED/WRITTEN_OFF — hasActiveApplication itself would return false for these, regression check that submitApplication doesn\'t second-guess it', async () => {
        // hasActiveApplication's own REJECTED/CLOSED/WRITTEN_OFF exclusion
        // is loans.repository.ts's concern, not re-tested here — this
        // confirms submitApplication trusts a false return and proceeds,
        // rather than e.g. accidentally always blocking on ANY prior
        // application regardless of status.
        mockHasActiveApplication.mockResolvedValue(false);

        await expect(
            cdlLoansService.submitApplication(USER_ID, baseInput),
        ).resolves.toBeDefined();
        expect(mockHasActiveApplication).toHaveBeenCalledWith(USER_ID);
        expect(mockCreateApplication).toHaveBeenCalledTimes(1);
    });
});
