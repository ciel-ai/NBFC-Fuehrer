// tests/unit/cdlLoans.partPayment.test.ts
//
// Coverage for audit finding #15 — a generic lump-sum part-payment,
// applied across whichever EMIs are actually due, oldest first, rather
// than processManualPayment's single named EMI (client spec Section 8,
// "Foreclosure & Part Payment").
//
// The critical correctness property under test: allocatePartialPayment
// (emi.calculator.ts) silently discards any surplus beyond a single
// EMI's own due, so every per-EMI payment call this service makes must be
// capped to that EMI's own true remaining due — never handed the raw
// remaining lump sum. The two-EMI test below is the one that would fail
// if that capping were wrong.

const mockFindAccountByIdOrThrow = jest.fn();
jest.mock('@/modules/loans/loans.repository', () => ({
    loansRepository: {
        findAccountByIdOrThrow: (...args: unknown[]) => mockFindAccountByIdOrThrow(...args),
    },
}));

const mockGetSummary = jest.fn();
const mockFindNextDueEmi = jest.fn();
jest.mock('@/modules/emi', () => ({
    emiService: {
        getSummary: (...args: unknown[]) => mockGetSummary(...args),
    },
    emiRepository: {
        findNextDueEmi: (...args: unknown[]) => mockFindNextDueEmi(...args),
    },
}));

const mockRecordCashPayment = jest.fn();
jest.mock('@/modules/payments', () => ({
    paymentsService: {
        recordCashPayment: (...args: unknown[]) => mockRecordCashPayment(...args),
    },
}));

const mockGeneratePaymentReceipt = jest.fn();
jest.mock('@/modules/documents/pdf.service', () => ({
    pdfService: {
        generatePaymentReceipt: (...args: unknown[]) => mockGeneratePaymentReceipt(...args),
    },
}));

const mockUpload = jest.fn();
const mockGetSignedUrl = jest.fn();
jest.mock('@/providers/docStorage', () => ({
    getDocStorageProvider: () => ({
        upload: (...args: unknown[]) => mockUpload(...args),
        getSignedUrl: (...args: unknown[]) => mockGetSignedUrl(...args),
    }),
}));

import { cdlLoansService } from '@/modules/cdlLoans/cdlLoans.service';
import { ForbiddenError, ValidationError } from '@/errors';
import { ROLE } from '@/config/constants';

const LOAN_ID = 'loan-account-1';
const OWNER_ID = 'user-1';
const OTHER_ID = 'user-2';
const STAFF_ROLE = ROLE.SUPER_ADMIN;
const ownedAccount = { id: LOAN_ID, userId: OWNER_ID, status: 'ACTIVE', interestRate: 13 };

function payment(id: string, amount: number) {
    return {
        id, amount, penaltyAmount: 0, totalCollected: amount,
        status: 'SUCCESS', settledAt: new Date(), initiatedAt: new Date(),
    };
}

beforeEach(() => {
    jest.clearAllMocks();
    mockFindAccountByIdOrThrow.mockResolvedValue(ownedAccount);
    mockUpload.mockResolvedValue({ key: 'k', eTag: 'e' });
    mockGeneratePaymentReceipt.mockResolvedValue(Buffer.from('pdf-bytes'));
    mockGetSignedUrl.mockImplementation((key: string) =>
        Promise.resolve({ url: `https://stub/s3/${key}`, expiresAt: new Date() }),
    );
});

describe('partPayment — single EMI', () => {
    test('a lump sum smaller than the next EMI due settles it PARTIAL, applies the full lump sum', async () => {
        mockGetSummary
            .mockResolvedValueOnce({ totalOutstanding: 10000 })  // upfront cap check
            .mockResolvedValueOnce({ totalOutstanding: 9000 });  // post-payment summary
        mockFindNextDueEmi.mockResolvedValueOnce({ id: 'emi-1', emiNumber: 1, emiAmount: 3000, penaltyAmount: 200 });
        mockRecordCashPayment.mockResolvedValueOnce(payment('pay-1', 1000));

        const result = await cdlLoansService.partPayment(LOAN_ID, 1000, OWNER_ID, undefined, {}, OWNER_ID, ROLE.CUSTOMER);

        expect(mockRecordCashPayment).toHaveBeenCalledTimes(1);
        expect(mockRecordCashPayment).toHaveBeenCalledWith(
            expect.objectContaining({ emiId: 'emi-1', amount: 1000 }), {},
        );
        expect(result.emisApplied).toHaveLength(1);
        expect(result.emisApplied[0]!.amountApplied).toBe(1000);
        expect(result.emisApplied[0]!.resultingStatus).toBe('PARTIAL');
        expect(result.totalAmountApplied).toBe(1000);
        expect(result.remainingOutstanding).toBe(9000);
        expect(result.fullyPaidOff).toBe(false);
    });

    test('a lump sum exactly matching the next EMI due settles it PAID', async () => {
        mockGetSummary
            .mockResolvedValueOnce({ totalOutstanding: 3000 })
            .mockResolvedValueOnce({ totalOutstanding: 0 });
        mockFindNextDueEmi.mockResolvedValueOnce({ id: 'emi-1', emiNumber: 1, emiAmount: 3000, penaltyAmount: 0 });
        mockRecordCashPayment.mockResolvedValueOnce(payment('pay-1', 3000));

        const result = await cdlLoansService.partPayment(LOAN_ID, 3000, OWNER_ID, undefined, {}, OWNER_ID, ROLE.CUSTOMER);

        expect(mockRecordCashPayment).toHaveBeenCalledTimes(1);
        expect(mockRecordCashPayment).toHaveBeenCalledWith(
            expect.objectContaining({ emiId: 'emi-1', amount: 3000 }), {},
        );
        expect(result.emisApplied).toHaveLength(1);
        expect(result.emisApplied[0]!.resultingStatus).toBe('PAID');
        expect(result.remainingOutstanding).toBe(0);
        expect(result.fullyPaidOff).toBe(true);
    });
});

describe('partPayment — spans two EMIs', () => {
    test('settles the first EMI fully, applies only the leftover to the second (not the original lump sum again)', async () => {
        mockGetSummary
            .mockResolvedValueOnce({ totalOutstanding: 10000 })
            .mockResolvedValueOnce({ totalOutstanding: 6000 });
        mockFindNextDueEmi
            .mockResolvedValueOnce({ id: 'emi-1', emiNumber: 1, emiAmount: 3000, penaltyAmount: 0 })
            .mockResolvedValueOnce({ id: 'emi-2', emiNumber: 2, emiAmount: 3000, penaltyAmount: 0 });
        mockRecordCashPayment
            .mockResolvedValueOnce(payment('pay-1', 3000))
            .mockResolvedValueOnce(payment('pay-2', 1000));

        const result = await cdlLoansService.partPayment(LOAN_ID, 4000, OWNER_ID, undefined, {}, OWNER_ID, ROLE.CUSTOMER);

        expect(mockRecordCashPayment).toHaveBeenCalledTimes(2);
        // The critical assertion: the second call gets exactly what's
        // left (1000), not the full original 4000 lump sum again — this
        // is the case that would fail if capping were done wrong (the
        // allocatePartialPayment surplus-discard bug this task worked
        // around).
        expect(mockRecordCashPayment).toHaveBeenNthCalledWith(
            1, expect.objectContaining({ emiId: 'emi-1', amount: 3000 }), {},
        );
        expect(mockRecordCashPayment).toHaveBeenNthCalledWith(
            2, expect.objectContaining({ emiId: 'emi-2', amount: 1000 }), {},
        );

        expect(result.emisApplied).toHaveLength(2);
        expect(result.emisApplied[0]).toMatchObject({ emiId: 'emi-1', amountApplied: 3000, resultingStatus: 'PAID', receiptUrl: 'https://stub/s3/receipts/cdl_pay-1.pdf' });
        expect(result.emisApplied[1]).toMatchObject({ emiId: 'emi-2', amountApplied: 1000, resultingStatus: 'PARTIAL', receiptUrl: 'https://stub/s3/receipts/cdl_pay-2.pdf' });
        expect(result.totalAmountApplied).toBe(4000);
        expect(mockGeneratePaymentReceipt).toHaveBeenCalledWith('pay-1');
        expect(mockGeneratePaymentReceipt).toHaveBeenCalledWith('pay-2');
    });
});

describe('partPayment — overpayment guard', () => {
    test('rejects a lump sum exceeding total outstanding, before touching any EMI', async () => {
        mockGetSummary.mockResolvedValueOnce({ totalOutstanding: 500 });

        await expect(
            cdlLoansService.partPayment(LOAN_ID, 1000, OWNER_ID, undefined, {}, OWNER_ID, ROLE.CUSTOMER),
        ).rejects.toThrow(ValidationError);

        expect(mockFindNextDueEmi).not.toHaveBeenCalled();
        expect(mockRecordCashPayment).not.toHaveBeenCalled();
        expect(mockGeneratePaymentReceipt).not.toHaveBeenCalled();
    });
});

describe('partPayment — ownership', () => {
    test('rejects a caller who does not own the account', async () => {
        await expect(
            cdlLoansService.partPayment(LOAN_ID, 1000, OTHER_ID, undefined, {}, OTHER_ID, ROLE.CUSTOMER),
        ).rejects.toThrow(ForbiddenError);
        expect(mockGetSummary).not.toHaveBeenCalled();
    });

    test('staff bypasses ownership', async () => {
        mockGetSummary
            .mockResolvedValueOnce({ totalOutstanding: 3000 })
            .mockResolvedValueOnce({ totalOutstanding: 2000 });
        mockFindNextDueEmi.mockResolvedValueOnce({ id: 'emi-1', emiNumber: 1, emiAmount: 3000, penaltyAmount: 0 });
        mockRecordCashPayment.mockResolvedValueOnce(payment('pay-1', 1000));

        await expect(
            cdlLoansService.partPayment(LOAN_ID, 1000, OTHER_ID, undefined, {}, OTHER_ID, STAFF_ROLE),
        ).resolves.toBeDefined();
    });
});
