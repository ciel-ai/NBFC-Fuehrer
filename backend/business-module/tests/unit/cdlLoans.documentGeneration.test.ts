// tests/unit/cdlLoans.documentGeneration.test.ts
//
// Coverage for audit finding #14 — the shared pdf.service.ts document
// pipeline (receipts, statements, closure letters, interest certificates,
// repayment schedules) already existed and was already used by other loan
// products, but CDL never called any of it except generateCdlLoanAgreement
// and generateNoc. closeLoan's closure-letter coverage lives in
// cdlLoans.generateNoc.test.ts (added alongside its own outstanding-balance
// guard tests); this file covers processManualPayment's new receipt, and
// the three brand-new on-demand document GET endpoints (statement,
// repayment schedule, interest certificate).

const mockFindAccountByIdOrThrow = jest.fn();
jest.mock('@/modules/loans/loans.repository', () => ({
    loansRepository: {
        findAccountByIdOrThrow: (...args: unknown[]) => mockFindAccountByIdOrThrow(...args),
    },
}));

const mockRecordCashPayment = jest.fn();
jest.mock('@/modules/payments', () => ({
    paymentsService: {
        recordCashPayment: (...args: unknown[]) => mockRecordCashPayment(...args),
    },
}));

const mockGeneratePaymentReceipt = jest.fn();
const mockGenerateLoanStatement = jest.fn();
const mockGenerateRepaymentSchedule = jest.fn();
const mockGenerateInterestCertificate = jest.fn();
jest.mock('@/modules/documents/pdf.service', () => ({
    pdfService: {
        generatePaymentReceipt: (...args: unknown[]) => mockGeneratePaymentReceipt(...args),
        generateLoanStatement: (...args: unknown[]) => mockGenerateLoanStatement(...args),
        generateRepaymentSchedule: (...args: unknown[]) => mockGenerateRepaymentSchedule(...args),
        generateInterestCertificate: (...args: unknown[]) => mockGenerateInterestCertificate(...args),
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
import { ForbiddenError } from '@/errors';
import { ROLE } from '@/config/constants';

const LOAN_ID = 'loan-account-1';
const OWNER_ID = 'user-1';
const OTHER_ID = 'user-2';
const STAFF_ROLE = ROLE.SUPER_ADMIN;
const ownedAccount = { id: LOAN_ID, userId: OWNER_ID, status: 'ACTIVE', interestRate: 13 };

beforeEach(() => {
    jest.clearAllMocks();
    mockUpload.mockResolvedValue({ key: 'k', eTag: 'e' });
});

describe('processManualPayment — receipt generation (audit finding #14)', () => {
    test('generates a real receipt keyed by payment.id (not emiId or loanId) and returns it as receiptUrl', async () => {
        mockFindAccountByIdOrThrow.mockResolvedValue(ownedAccount);
        mockRecordCashPayment.mockResolvedValue({
            id: 'pay-99', amount: 1000, penaltyAmount: 0, totalCollected: 1000,
            status: 'SUCCESS', settledAt: new Date(), initiatedAt: new Date(),
        });
        mockGeneratePaymentReceipt.mockResolvedValue(Buffer.from('pdf-bytes'));
        mockUpload.mockResolvedValue({ key: 'receipts/cdl_pay-99.pdf', eTag: 'etag-1' });
        mockGetSignedUrl.mockResolvedValue({
            url: 'https://stub/s3/receipts/cdl_pay-99.pdf',
            expiresAt: new Date(),
        });

        const result = await cdlLoansService.processManualPayment(
            LOAN_ID, 'emi-1', 1000, OWNER_ID, undefined, {}, OWNER_ID, ROLE.CUSTOMER,
        );

        // The easy mix-up the task flagged: this must be payment.id
        // ('pay-99'), not the emiId ('emi-1') or the loan/account id.
        expect(mockGeneratePaymentReceipt).toHaveBeenCalledWith('pay-99');
        expect(mockGeneratePaymentReceipt).not.toHaveBeenCalledWith('emi-1');
        expect(mockGeneratePaymentReceipt).not.toHaveBeenCalledWith(LOAN_ID);
        expect(mockUpload).toHaveBeenCalledWith(
            expect.objectContaining({ key: 'receipts/cdl_pay-99.pdf', contentType: 'application/pdf' }),
        );
        // Not a fabricated string — the real signed URL from getSignedUrl().
        expect(result.receiptUrl).toBe('https://stub/s3/receipts/cdl_pay-99.pdf');
    });
});

describe('getLoanStatement (audit finding #14)', () => {
    test('rejects a caller who does not own the account', async () => {
        mockFindAccountByIdOrThrow.mockResolvedValue(ownedAccount);
        await expect(
            cdlLoansService.getLoanStatement(LOAN_ID, OTHER_ID, ROLE.CUSTOMER),
        ).rejects.toThrow(ForbiddenError);
        expect(mockGenerateLoanStatement).not.toHaveBeenCalled();
    });

    test('staff bypasses ownership and receives a real signed URL, not a placeholder', async () => {
        mockFindAccountByIdOrThrow.mockResolvedValue(ownedAccount);
        mockGenerateLoanStatement.mockResolvedValue(Buffer.from('pdf-bytes'));
        mockGetSignedUrl.mockResolvedValue({
            url: 'https://stub/s3/statements/cdl_loan-account-1.pdf',
            expiresAt: new Date(),
        });

        const result = await cdlLoansService.getLoanStatement(LOAN_ID, OTHER_ID, STAFF_ROLE);

        expect(mockGenerateLoanStatement).toHaveBeenCalledWith(LOAN_ID);
        expect(result.documentUrl).toBe('https://stub/s3/statements/cdl_loan-account-1.pdf');
    });

    test('owner can fetch their own statement', async () => {
        mockFindAccountByIdOrThrow.mockResolvedValue(ownedAccount);
        mockGenerateLoanStatement.mockResolvedValue(Buffer.from('pdf-bytes'));
        mockGetSignedUrl.mockResolvedValue({
            url: 'https://stub/s3/statements/cdl_loan-account-1.pdf',
            expiresAt: new Date(),
        });

        await expect(
            cdlLoansService.getLoanStatement(LOAN_ID, OWNER_ID, ROLE.CUSTOMER),
        ).resolves.toBeDefined();
    });
});

describe('getRepaymentSchedule (audit finding #14)', () => {
    test('rejects a caller who does not own the account', async () => {
        mockFindAccountByIdOrThrow.mockResolvedValue(ownedAccount);
        await expect(
            cdlLoansService.getRepaymentSchedule(LOAN_ID, OTHER_ID, ROLE.CUSTOMER),
        ).rejects.toThrow(ForbiddenError);
        expect(mockGenerateRepaymentSchedule).not.toHaveBeenCalled();
    });

    test('staff bypasses ownership and receives a real signed URL, not a placeholder', async () => {
        mockFindAccountByIdOrThrow.mockResolvedValue(ownedAccount);
        mockGenerateRepaymentSchedule.mockResolvedValue(Buffer.from('pdf-bytes'));
        mockGetSignedUrl.mockResolvedValue({
            url: 'https://stub/s3/repayment-schedules/cdl_loan-account-1.pdf',
            expiresAt: new Date(),
        });

        const result = await cdlLoansService.getRepaymentSchedule(LOAN_ID, OTHER_ID, STAFF_ROLE);

        expect(mockGenerateRepaymentSchedule).toHaveBeenCalledWith(LOAN_ID);
        expect(result.documentUrl).toBe('https://stub/s3/repayment-schedules/cdl_loan-account-1.pdf');
    });
});

describe('getInterestCertificate (audit finding #14)', () => {
    test('rejects a caller who does not own the account', async () => {
        mockFindAccountByIdOrThrow.mockResolvedValue(ownedAccount);
        await expect(
            cdlLoansService.getInterestCertificate(LOAN_ID, undefined, OTHER_ID, ROLE.CUSTOMER),
        ).rejects.toThrow(ForbiddenError);
        expect(mockGenerateInterestCertificate).not.toHaveBeenCalled();
    });

    test('staff bypasses ownership; explicit financialYear is passed through untouched', async () => {
        mockFindAccountByIdOrThrow.mockResolvedValue(ownedAccount);
        mockGenerateInterestCertificate.mockResolvedValue(Buffer.from('pdf-bytes'));
        mockGetSignedUrl.mockResolvedValue({
            url: 'https://stub/s3/interest-certificates/cdl_loan-account-1_2024-25.pdf',
            expiresAt: new Date(),
        });

        const result = await cdlLoansService.getInterestCertificate(LOAN_ID, '2024-25', OTHER_ID, STAFF_ROLE);

        expect(mockGenerateInterestCertificate).toHaveBeenCalledWith(LOAN_ID, '2024-25');
        expect(result.documentUrl).toBe('https://stub/s3/interest-certificates/cdl_loan-account-1_2024-25.pdf');
    });

    test('defaults to the current Indian financial year (April-March) when omitted', async () => {
        mockFindAccountByIdOrThrow.mockResolvedValue(ownedAccount);
        mockGenerateInterestCertificate.mockResolvedValue(Buffer.from('pdf-bytes'));
        mockGetSignedUrl.mockResolvedValue({ url: 'https://stub/doc.pdf', expiresAt: new Date() });

        await cdlLoansService.getInterestCertificate(LOAN_ID, undefined, OWNER_ID, ROLE.CUSTOMER);

        const now = new Date();
        const startYear = now.getMonth() < 3 ? now.getFullYear() - 1 : now.getFullYear();
        const expectedFy = `${startYear}-${String(startYear + 1).slice(-2)}`;
        expect(mockGenerateInterestCertificate).toHaveBeenCalledWith(LOAN_ID, expectedFy);
    });
});
