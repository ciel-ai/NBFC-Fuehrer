// tests/unit/emi.markPaid.test.ts
//
// Regression test for CDL audit finding #3 (any nonzero payment marked an
// EMI fully PAID). The root cause lived here — emiService.markPaid — not
// in any one product's module: any payments.service.ts caller (CDL manual
// cash payment, payment-link capture, eNACH auto-debit) routes through
// this same function.
//
// Before this fix: emiRepository.markPaid was called unconditionally with
// status: PAID regardless of whether paidAmount covered the EMI. Only the
// penalty component had a residual-tracking mechanism; principal/interest
// shortfall was silently forgiven. allocatePartialPayment (emi.calculator
// .ts) already computed the correct penalty/interest/principal/shortfall/
// fullySettled split — every field except penaltySettled was discarded.
// That let getSummary's totalOutstanding (which sums by EMI status) read
// 0 for a systematically underpaid loan, letting closeLoan succeed and
// generateNoc issue a real NOC for a loan that was never actually repaid.
//
// Now markPaid branches on allocation.fullySettled: full settlement keeps
// the exact prior behavior (status PAID, GL posted with the full
// scheduled split). An insufficient payment instead calls the new
// emiRepository.recordPartialPayment — status PARTIAL (an EMI_STATUS
// value that existed in the schema/enum but was never actually used
// anywhere), remaining amounts decremented by exactly what was settled,
// GL posted only for what actually moved this time.

const mockFindByIdOrThrow = jest.fn();
const mockMarkPaid = jest.fn();
const mockRecordPartialPayment = jest.fn();

jest.mock('@/modules/emi/emi.repository', () => ({
    emiRepository: {
        findByIdOrThrow: (...args: unknown[]) => mockFindByIdOrThrow(...args),
        markPaid: (...args: unknown[]) => mockMarkPaid(...args),
        recordPartialPayment: (...args: unknown[]) => mockRecordPartialPayment(...args),
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

const mockPostEmiCollection = jest.fn();
jest.mock('@/modules/accounting/accounting.service', () => ({
    accountingService: { postEmiCollection: (...args: unknown[]) => mockPostEmiCollection(...args) },
}));

const mockEventBusEmit = jest.fn();
jest.mock('@/events', () => ({
    eventBus: { emit: (...args: unknown[]) => mockEventBusEmit(...args) },
}));

import { emiService } from '@/modules/emi';
import { EmiAlreadyPaidError, ConflictError } from '@/errors';
import { EMI_STATUS } from '@/config/constants';

const EMI_ID = 'emi-1';
const LOAN_ACCOUNT_ID = 'loan-account-1';
const REQ = { requestId: 'req-1' } as any;

function pendingEmi(overrides: Partial<Record<string, unknown>> = {}) {
    return {
        id: EMI_ID,
        loanAccountId: LOAN_ACCOUNT_ID,
        emiNumber: 3,
        status: EMI_STATUS.PENDING,
        emiAmount: 5000,
        principalComponent: 4200,
        interestComponent: 800,
        penaltyAmount: 0,
        ...overrides,
    };
}

beforeEach(() => {
    jest.clearAllMocks();
    mockFindAccountByIdOrThrow.mockResolvedValue({ userId: 'user-1' });
    mockLoanApplicationsFindUniqueOrThrow.mockResolvedValue({ product_type: 'CONSUMER_DURABLE' });
    mockMarkPaid.mockResolvedValue({ id: EMI_ID, status: EMI_STATUS.PAID });
    mockRecordPartialPayment.mockResolvedValue({ id: EMI_ID, status: EMI_STATUS.PARTIAL });
});

describe('markPaid — full settlement (regression: unchanged behavior)', () => {
    test('a payment covering the full EMI + penalty marks it PAID, not PARTIAL', async () => {
        mockFindByIdOrThrow.mockResolvedValue(pendingEmi());

        await emiService.markPaid(
            { emiId: EMI_ID, paidAmount: 5000, paidAt: new Date(), channel: 'CASH' },
            REQ,
        );

        expect(mockMarkPaid).toHaveBeenCalledWith(EMI_ID, expect.any(Date), undefined, 0);
        expect(mockRecordPartialPayment).not.toHaveBeenCalled();
    });

    test('GL posting uses the full scheduled principal/interest split on full settlement', async () => {
        mockFindByIdOrThrow.mockResolvedValue(pendingEmi());

        await emiService.markPaid(
            { emiId: EMI_ID, paidAmount: 5000, paidAt: new Date(), channel: 'CASH' },
            REQ,
        );

        expect(mockPostEmiCollection).toHaveBeenCalledWith(
            expect.objectContaining({ principal: 4200, interest: 800 }),
        );
    });

    test('a payment that exceeds the EMI (extra covers pre-existing penalty) still marks PAID', async () => {
        mockFindByIdOrThrow.mockResolvedValue(pendingEmi({ penaltyAmount: 200 }));

        await emiService.markPaid(
            { emiId: EMI_ID, paidAmount: 5200, paidAt: new Date(), channel: 'CASH' },
            REQ,
        );

        expect(mockMarkPaid).toHaveBeenCalledWith(EMI_ID, expect.any(Date), undefined, 0);
    });
});

describe('markPaid — insufficient payment (the actual bug being fixed)', () => {
    test('a payment smaller than the EMI due is recorded as PARTIAL, not PAID', async () => {
        mockFindByIdOrThrow.mockResolvedValue(pendingEmi());

        // ₹1 against a ₹5,000 EMI — exactly the scenario the audit flagged
        // as silently marking the whole EMI PAID.
        await emiService.markPaid(
            { emiId: EMI_ID, paidAmount: 1, paidAt: new Date(), channel: 'CASH' },
            REQ,
        );

        expect(mockMarkPaid).not.toHaveBeenCalled();
        expect(mockRecordPartialPayment).toHaveBeenCalledWith(
            EMI_ID,
            undefined,
            expect.objectContaining({ penaltySettled: 0, interestSettled: 1, principalSettled: 0 }),
        );
    });

    test('remaining amounts are decremented by exactly what was settled, not recomputed from a fixed shortfall', async () => {
        mockFindByIdOrThrow.mockResolvedValue(pendingEmi({ principalComponent: 4200, interestComponent: 800 }));

        // Covers interest fully (800) + part of principal (1000) = 1800.
        await emiService.markPaid(
            { emiId: EMI_ID, paidAmount: 1800, paidAt: new Date(), channel: 'CASH' },
            REQ,
        );

        expect(mockRecordPartialPayment).toHaveBeenCalledWith(
            EMI_ID,
            undefined,
            { penaltySettled: 0, interestSettled: 800, principalSettled: 1000 },
        );
    });

    test('GL posting on a partial payment uses only what was actually collected, not the full scheduled split', async () => {
        mockFindByIdOrThrow.mockResolvedValue(pendingEmi());

        await emiService.markPaid(
            { emiId: EMI_ID, paidAmount: 500, paidAt: new Date(), channel: 'CASH' },
            REQ,
        );

        // Interest is settled first (per allocatePartialPayment's
        // penalty->interest->principal order) — 500 of 800 interest due,
        // 0 toward principal. Posting the full scheduled split here
        // (4200/800) would overstate the ledger.
        expect(mockPostEmiCollection).toHaveBeenCalledWith(
            expect.objectContaining({ principal: 0, interest: 500 }),
        );
    });

    test('a payment that only covers pre-existing penalty, nothing else, still records PARTIAL', async () => {
        mockFindByIdOrThrow.mockResolvedValue(pendingEmi({ penaltyAmount: 300 }));

        await emiService.markPaid(
            { emiId: EMI_ID, paidAmount: 300, paidAt: new Date(), channel: 'CASH' },
            REQ,
        );

        expect(mockRecordPartialPayment).toHaveBeenCalledWith(
            EMI_ID,
            undefined,
            { penaltySettled: 300, interestSettled: 0, principalSettled: 0 },
        );
    });

    test('multiple partial payments can accumulate to eventual full settlement (second call sees the reduced remainder)', async () => {
        // First call: EMI still shows the original ₹5,000/₹800/₹4,200 —
        // pays 3000, settles interest (800) + 2200 of principal.
        mockFindByIdOrThrow.mockResolvedValueOnce(pendingEmi());
        await emiService.markPaid(
            { emiId: EMI_ID, paidAmount: 3000, paidAt: new Date(), channel: 'CASH' },
            REQ,
        );
        expect(mockRecordPartialPayment).toHaveBeenCalledWith(
            EMI_ID, undefined, { penaltySettled: 0, interestSettled: 800, principalSettled: 2200 },
        );

        // Second call: repository now reflects the PARTIAL row's reduced
        // remainder (status PARTIAL, interest 0, principal 2000) — a
        // payment of exactly 2000 now fully settles it.
        mockFindByIdOrThrow.mockResolvedValueOnce(
            pendingEmi({ status: EMI_STATUS.PARTIAL, interestComponent: 0, principalComponent: 2000 }),
        );
        await emiService.markPaid(
            { emiId: EMI_ID, paidAmount: 2000, paidAt: new Date(), channel: 'CASH' },
            REQ,
        );
        expect(mockMarkPaid).toHaveBeenCalledWith(EMI_ID, expect.any(Date), undefined, 0);
    });
});

describe('markPaid — pre-existing guards unchanged', () => {
    test('an already-PAID EMI still throws EmiAlreadyPaidError', async () => {
        mockFindByIdOrThrow.mockResolvedValue(pendingEmi({ status: EMI_STATUS.PAID }));

        await expect(
            emiService.markPaid({ emiId: EMI_ID, paidAmount: 5000, paidAt: new Date(), channel: 'CASH' }, REQ),
        ).rejects.toThrow(EmiAlreadyPaidError);
        expect(mockMarkPaid).not.toHaveBeenCalled();
        expect(mockRecordPartialPayment).not.toHaveBeenCalled();
    });

    test('a WAIVED EMI still throws ConflictError', async () => {
        mockFindByIdOrThrow.mockResolvedValue(pendingEmi({ status: EMI_STATUS.WAIVED }));

        await expect(
            emiService.markPaid({ emiId: EMI_ID, paidAmount: 5000, paidAt: new Date(), channel: 'CASH' }, REQ),
        ).rejects.toThrow(ConflictError);
    });
});

describe('markPaid — payment.received event still fires either way', () => {
    test('fires on full settlement', async () => {
        mockFindByIdOrThrow.mockResolvedValue(pendingEmi());
        await emiService.markPaid(
            { emiId: EMI_ID, paidAmount: 5000, paidAt: new Date(), channel: 'CASH' }, REQ,
        );
        expect(mockEventBusEmit).toHaveBeenCalledWith('payment.received', expect.objectContaining({ amount: 5000 }));
    });

    test('fires on a partial settlement too — real money moved even though the EMI is not fully paid', async () => {
        mockFindByIdOrThrow.mockResolvedValue(pendingEmi());
        await emiService.markPaid(
            { emiId: EMI_ID, paidAmount: 500, paidAt: new Date(), channel: 'CASH' }, REQ,
        );
        expect(mockEventBusEmit).toHaveBeenCalledWith('payment.received', expect.objectContaining({ amount: 500 }));
    });
});
