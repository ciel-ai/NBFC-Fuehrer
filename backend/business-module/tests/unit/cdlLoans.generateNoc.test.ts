// tests/unit/cdlLoans.generateNoc.test.ts
//
// Coverage for real CDL NOC generation (completing the CDL finish-line
// guide's last fake endpoint — cdlLoansService.generateNoc previously
// returned a fabricated URL and called nothing real).
//
// Also covers the closeLoan outstanding-balance guard added in the same
// change: housingLoans.service.ts's closeLoan already refused to close a
// loan with a remaining balance; CDL's had no equivalent check and closed
// unconditionally.

const mockFindAccountByIdOrThrow = jest.fn();
const mockUpdateAccountStatus = jest.fn();
jest.mock('@/modules/loans/loans.repository', () => ({
    loansRepository: {
        findAccountByIdOrThrow: (...args: unknown[]) => mockFindAccountByIdOrThrow(...args),
        updateAccountStatus: (...args: unknown[]) => mockUpdateAccountStatus(...args),
    },
}));

const mockGetSummary = jest.fn();
const mockGetForeclosureQuote = jest.fn();
jest.mock('@/modules/emi', () => ({
    emiService: {
        getSummary: (...args: unknown[]) => mockGetSummary(...args),
        getForeclosureQuote: (...args: unknown[]) => mockGetForeclosureQuote(...args),
    },
}));

const mockGeneratePdfNoc = jest.fn();
jest.mock('@/modules/documents/pdf.service', () => ({
    pdfService: { generateNoc: (...args: unknown[]) => mockGeneratePdfNoc(...args) },
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
import { LoanStateError } from '@/errors';
import { LOAN_STATUS, ROLE } from '@/config/constants';

const LOAN_ID = 'loan-account-1';
// These tests exercise generateNoc/closeLoan's own business logic, not the
// ownership check (that gets its own dedicated coverage in
// cdlLoans.ownership.test.ts) — calling as staff bypasses the ownership
// check regardless of the mocked account's userId, same as every other
// pre-existing mock here that doesn't set one.
const STAFF_CALLER_ID = 'staff-1';
const STAFF_ROLE = ROLE.SUPER_ADMIN;

describe('cdlLoansService.generateNoc', () => {
    beforeEach(() => jest.clearAllMocks());

    test('(a) on a CLOSED loan: calls pdfService.generateNoc + docStorage.upload, returns a real (not fabricated) nocS3Url', async () => {
        mockFindAccountByIdOrThrow.mockResolvedValue({ status: LOAN_STATUS.CLOSED });
        mockGeneratePdfNoc.mockResolvedValue(Buffer.from('pdf-bytes'));
        mockUpload.mockResolvedValue({ key: `noc/cdl_${LOAN_ID}.pdf`, eTag: 'etag-1' });
        mockGetSignedUrl.mockResolvedValue({
            url: 'https://stub/s3/noc/cdl_loan-account-1.pdf',
            expiresAt: new Date(),
        });

        const result = await cdlLoansService.generateNoc(LOAN_ID, STAFF_CALLER_ID, STAFF_ROLE);

        expect(mockGeneratePdfNoc).toHaveBeenCalledWith(LOAN_ID);
        expect(mockUpload).toHaveBeenCalledWith(
            expect.objectContaining({ key: `noc/cdl_${LOAN_ID}.pdf`, contentType: 'application/pdf' }),
        );
        // Not the old fabricated https://${bucket}.s3.${region}... string —
        // a real URL that actually came from getSignedUrl().
        expect(result.nocS3Url).toBe('https://stub/s3/noc/cdl_loan-account-1.pdf');
        expect(result.nocRef).toMatch(new RegExp(`^NOC-CDL-${LOAN_ID}-\\d+$`));
    });

    test('(b) on a loan that is NOT closed: rejected, never touches the PDF/storage pipeline', async () => {
        mockFindAccountByIdOrThrow.mockResolvedValue({ status: LOAN_STATUS.ACTIVE });

        await expect(cdlLoansService.generateNoc(LOAN_ID, STAFF_CALLER_ID, STAFF_ROLE)).rejects.toThrow(LoanStateError);

        expect(mockGeneratePdfNoc).not.toHaveBeenCalled();
        expect(mockUpload).not.toHaveBeenCalled();
    });

    test('(c) response shape matches what the controller/callers expect: exactly { nocRef, nocS3Url }', async () => {
        mockFindAccountByIdOrThrow.mockResolvedValue({ status: LOAN_STATUS.CLOSED });
        mockGeneratePdfNoc.mockResolvedValue(Buffer.from('pdf-bytes'));
        mockUpload.mockResolvedValue({ key: `noc/cdl_${LOAN_ID}.pdf`, eTag: 'etag-1' });
        mockGetSignedUrl.mockResolvedValue({ url: 'https://stub/s3/noc/cdl_loan-account-1.pdf', expiresAt: new Date() });

        const result = await cdlLoansService.generateNoc(LOAN_ID, STAFF_CALLER_ID, STAFF_ROLE);

        expect(Object.keys(result).sort()).toEqual(['nocRef', 'nocS3Url']);
        expect(typeof result.nocRef).toBe('string');
        expect(typeof result.nocS3Url).toBe('string');
    });
});

// Bonus coverage for Step 4 (outstanding-balance guard), not explicitly
// requested but directly adjacent and cheap given the mocks above.
describe('cdlLoansService.closeLoan — outstanding-balance guard', () => {
    beforeEach(() => jest.clearAllMocks());

    test('refuses to close a loan with a remaining balance', async () => {
        mockFindAccountByIdOrThrow.mockResolvedValue({ status: LOAN_STATUS.ACTIVE, interestRate: 13 });
        mockGetSummary.mockResolvedValue({ totalOutstanding: 5000 });

        await expect(cdlLoansService.closeLoan(LOAN_ID, STAFF_CALLER_ID, STAFF_ROLE)).rejects.toThrow(LoanStateError);
        expect(mockUpdateAccountStatus).not.toHaveBeenCalled();
    });

    test('closes successfully once the balance is fully paid off', async () => {
        mockFindAccountByIdOrThrow.mockResolvedValue({ status: LOAN_STATUS.ACTIVE, interestRate: 13 });
        mockGetSummary.mockResolvedValue({ totalOutstanding: 0 });
        mockGetForeclosureQuote.mockResolvedValue({ total: 0 });
        mockUpdateAccountStatus.mockResolvedValue({ status: LOAN_STATUS.CLOSED });

        const result = await cdlLoansService.closeLoan(LOAN_ID, STAFF_CALLER_ID, STAFF_ROLE);

        expect(mockUpdateAccountStatus).toHaveBeenCalledWith(
            LOAN_ID, LOAN_STATUS.CLOSED, expect.objectContaining({ closed_at: expect.any(Date) }),
        );
        expect(result.loanId).toBe(LOAN_ID);
    });
});
