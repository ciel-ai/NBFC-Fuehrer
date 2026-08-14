// tests/unit/cdlLoans.disburseTotals.test.ts
//
// Regression test for the CDL EMI/total-payable audit: disburseToMerchant
// previously derived loan_accounts.total_interest (and, from it,
// outstanding_balance) from `emi * tenureMonths` — a shortcut that
// silently disagrees with the real amortization schedule once the final
// installment absorbs a rounding residual. The very same function already
// built the real schedule (buildAmortizationSchedule) a few lines later
// for the emi_schedule rows, so the account's own totals and the schedule
// actually billed to the customer could drift apart within one call.
//
// This asserts loan_accounts is now created with total_interest/
// outstanding_balance taken from that same schedule — not recomputed via
// the shortcut — using a principal/rate/tenure combination (₹7,000 / 14% /
// 12 months) chosen because it is exactly the CASE 2 test case from the
// audit spec, and small enough that the rounding residual the last
// installment absorbs is non-trivial relative to the total.
//
// Mocking scaffold mirrors cdlLoans.esignPerApplication.test.ts, which
// covers this same function's transactionality.

const mockFindApplicationByIdOrThrow = jest.fn();

jest.mock('@/modules/loans/loans.repository', () => ({
    loansRepository: {
        findApplicationByIdOrThrow: (...args: unknown[]) => mockFindApplicationByIdOrThrow(...args),
        findCustomerByUserId: jest.fn(),
        updateApplicationStatus: jest.fn(),
        updateAccountStatus: jest.fn(),
    },
}));

const mockLoanApplicationsFindUnique = jest.fn();
const mockQueryRaw = jest.fn();

const mockTxLoanAccountsCreate = jest.fn();
const mockTxLoanAccountsUpdate = jest.fn();
const mockTxEmiScheduleCreateMany = jest.fn();
const mockTxLoanApplicationsUpdate = jest.fn();
const mockTxDisbursementsCreate = jest.fn();
const mockTxDisbursementsUpdate = jest.fn();

const txMock = {
    loan_accounts: {
        create: (...args: unknown[]) => mockTxLoanAccountsCreate(...args),
        update: (...args: unknown[]) => mockTxLoanAccountsUpdate(...args),
    },
    emi_schedule: {
        createMany: (...args: unknown[]) => mockTxEmiScheduleCreateMany(...args),
    },
    loan_applications: {
        update: (...args: unknown[]) => mockTxLoanApplicationsUpdate(...args),
    },
    disbursements: {
        create: (...args: unknown[]) => mockTxDisbursementsCreate(...args),
        update: (...args: unknown[]) => mockTxDisbursementsUpdate(...args),
    },
};

const mockWithTransaction = jest.fn((callback: (tx: typeof txMock) => Promise<unknown>) => callback(txMock));

jest.mock('@/config/database', () => ({
    prisma: {
        loan_applications: {
            findUnique: (...args: unknown[]) => mockLoanApplicationsFindUnique(...args),
        },
        disbursements: { update: jest.fn() },
        $queryRaw: (...args: unknown[]) => mockQueryRaw(...args),
    },
    withTransaction: (...args: [(tx: typeof txMock) => Promise<unknown>]) => mockWithTransaction(...args),
}));

const mockCreatePayout = jest.fn();
jest.mock('@/providers', () => ({
    getPaymentProvider: () => ({ createPayout: (...args: unknown[]) => mockCreatePayout(...args) }),
}));

import { cdlLoansService } from '@/modules/cdlLoans/cdlLoans.service';
import { buildAmortizationSchedule } from '@/modules/emi/emi.calculator';

const APP_ID = 'app-1';

function approvedApplication() {
    return {
        id: APP_ID,
        userId: 'user-1',
        approvedAmount: 7000,
        interestRate: 14,
        tenureMonths: 12,
        processingFee: 1463,
    };
}

describe('disburseToMerchant — loan_accounts.total_interest / outstanding_balance come from the real schedule', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockWithTransaction.mockImplementation((callback) => callback(txMock));
        mockQueryRaw.mockResolvedValue([{ current_value: 1 }]);
        mockFindApplicationByIdOrThrow.mockResolvedValue(approvedApplication());
        mockLoanApplicationsFindUnique.mockResolvedValue({ esign_status: 'SIGNED', estamp_status: 'APPLIED' });
        mockTxLoanAccountsCreate.mockResolvedValue({ id: 'account-1', status: 'DISBURSED' });
        mockTxEmiScheduleCreateMany.mockResolvedValue({ count: 12 });
        mockTxLoanApplicationsUpdate.mockResolvedValue({});
        mockTxDisbursementsCreate.mockResolvedValue({ id: 'disb-1', utr_number: null, completed_at: null });
        mockTxDisbursementsUpdate.mockResolvedValue({ id: 'disb-1', status: 'COMPLETED' });
        mockTxLoanAccountsUpdate.mockResolvedValue({});
        mockCreatePayout.mockResolvedValue({ status: 'DONE', utrNumber: 'UTR123', payoutId: 'payout-1' });
    });

    test('total_interest matches sum(schedule interest), not emi * tenureMonths', async () => {
        await cdlLoansService.disburseToMerchant(APP_ID, {
            merchantName: 'Mobile World', amount: 6500, initiatedBy: 'finance-1',
        });

        const expectedSchedule = buildAmortizationSchedule({
            loanAccountId: 'account-1',
            principal: 7000,
            annualRatePct: 14,
            tenureMonths: 12,
            disbursementDate: new Date(),
        });

        expect(mockTxLoanAccountsCreate).toHaveBeenCalledTimes(1);
        const createArgs = mockTxLoanAccountsCreate.mock.calls[0]![0] as {
            data: { total_interest: number; outstanding_balance: number; monthly_emi: number };
        };

        expect(createArgs.data.monthly_emi).toBe(expectedSchedule.monthlyEmi);
        expect(createArgs.data.total_interest).toBe(expectedSchedule.totalInterest);
        expect(createArgs.data.outstanding_balance).toBe(7000 + expectedSchedule.totalInterest);

        // The bug this closes: the shortcut and the real schedule total can
        // legitimately differ once rounding is involved — asserting the
        // written value is the schedule sum (above) is the real regression
        // guard; this just documents why the shortcut was wrong in the
        // first place for this specific principal/rate/tenure.
        const shortcutTotalInterest = Math.max(
            0,
            Math.round(expectedSchedule.monthlyEmi * 12 * 100) / 100 - 7000,
        );
        if (shortcutTotalInterest !== expectedSchedule.totalInterest) {
            expect(createArgs.data.total_interest).not.toBe(shortcutTotalInterest);
        }
    });

    test('the persisted EMI schedule rows use the real account id, not the placeholder used to derive the totals', async () => {
        await cdlLoansService.disburseToMerchant(APP_ID, {
            merchantName: 'Mobile World', amount: 6500, initiatedBy: 'finance-1',
        });

        expect(mockTxEmiScheduleCreateMany).toHaveBeenCalledTimes(1);
        const scheduleArgs = mockTxEmiScheduleCreateMany.mock.calls[0]![0] as {
            data: { loan_account_id: string }[];
        };
        expect(scheduleArgs.data.length).toBe(12);
        for (const row of scheduleArgs.data) {
            expect(row.loan_account_id).toBe('account-1');
        }
    });
});
