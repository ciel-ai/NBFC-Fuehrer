// tests/unit/cdlLoans.agreementIdempotency.test.ts
//
// Regression test for CDL audit finding #11: generateAgreement had no
// idempotency guard at all. Calling it twice (retry, double-tap, or just
// calling it again) silently generated a SECOND real eSign request and
// overwrote esign_status back to the new request's unsigned initial
// state. If the customer had already completed Aadhaar-OTP signing on
// the first request, that completed signature was orphaned — the DB now
// pointed at a new, never-signed request, and completeESign's poll would
// check the wrong one forever.
//
// generateAgreement now short-circuits in two cases:
//   - esign_status === 'SIGNED' → returns the existing signed document,
//     never touches the PDF generator or eSign provider again.
//   - esign_status === 'PENDING' (a request exists, unresolved) →
//     ConflictError, rather than burning a second real provider call or
//     handing out a second, confusing signing link.
// FAILED/EXPIRED/CANCELLED are deliberately NOT blocked — those are
// genuine dead ends the customer needs a fresh request to recover from.

const mockLoanApplicationsFindUniqueOrThrow = jest.fn();
const mockKycDocumentsFindUnique = jest.fn();

jest.mock('@/config/database', () => ({
    prisma: {
        loan_applications: {
            findUniqueOrThrow: (...args: unknown[]) => mockLoanApplicationsFindUniqueOrThrow(...args),
            update: jest.fn(),
        },
        kyc_documents: {
            findUnique: (...args: unknown[]) => mockKycDocumentsFindUnique(...args),
        },
    },
}));

const mockGeneratePdf = jest.fn();
jest.mock('@/modules/documents/pdf.service', () => ({
    pdfService: { generateCdlLoanAgreement: (...args: unknown[]) => mockGeneratePdf(...args) },
}));

const mockUpload = jest.fn();
const mockGetSignedUrl = jest.fn();
jest.mock('@/providers/docStorage', () => ({
    getDocStorageProvider: () => ({
        upload: (...args: unknown[]) => mockUpload(...args),
        getSignedUrl: (...args: unknown[]) => mockGetSignedUrl(...args),
    }),
}));

const mockDecrypt = jest.fn();
jest.mock('@/providers/encryption', () => ({
    getEncryptionProvider: () => ({ decrypt: (...args: unknown[]) => mockDecrypt(...args) }),
}));

const mockCreateSignRequest = jest.fn();
jest.mock('@/providers/esign', () => ({
    getESignProvider: () => ({
        createSignRequest: (...args: unknown[]) => mockCreateSignRequest(...args),
        getSignStatus: jest.fn(),
        applyEStamp: jest.fn(),
        getSignedDocument: jest.fn(),
    }),
}));

import { cdlLoansService } from '@/modules/cdlLoans/cdlLoans.service';
import { ConflictError, ValidationError } from '@/errors';
import { ROLE } from '@/config/constants';

const APPLICATION_ID = 'app-1';
const OWNER_ID = 'user-1';

function applicationRow(overrides: Partial<Record<string, unknown>> = {}) {
    return {
        id: APPLICATION_ID,
        user_id: OWNER_ID,
        esign_request_id: null,
        esign_status: null,
        signed_agreement_s3_key: null,
        user: { full_name: 'Test User', phone: '+919999999999' },
        ...overrides,
    };
}

beforeEach(() => {
    jest.clearAllMocks();
    mockKycDocumentsFindUnique.mockResolvedValue({ aadhaar_encrypted: 'ciphertext' });
    mockGeneratePdf.mockResolvedValue(Buffer.from('pdf'));
    mockUpload.mockResolvedValue({ key: 'agreements/cdl/app-1.pdf', eTag: 'etag' });
    mockGetSignedUrl.mockResolvedValue({ url: 'https://stub/agreements/app-1.pdf', expiresAt: new Date() });
    mockDecrypt.mockResolvedValue('999912345678');
    mockCreateSignRequest.mockResolvedValue({
        requestId: 'req-new', signingUrl: 'https://stub/sign/req-new', status: 'PENDING', expiresAt: new Date(),
    });
});

describe('generateAgreement — already SIGNED is idempotent, not regenerated', () => {
    test('returns the existing signed document instead of generating a new one', async () => {
        mockLoanApplicationsFindUniqueOrThrow.mockResolvedValue(applicationRow({
            esign_request_id: 'req-old', esign_status: 'SIGNED', signed_agreement_s3_key: 'agreements/cdl/app-1_signed.pdf',
        }));
        mockGetSignedUrl.mockResolvedValue({ url: 'https://stub/signed.pdf', expiresAt: new Date() });

        const result = await cdlLoansService.generateAgreement(APPLICATION_ID, OWNER_ID, ROLE.CUSTOMER);

        expect(result.status).toBe('SIGNED');
        expect(result.agreementUrl).toBe('https://stub/signed.pdf');
        expect(result.eSignRequestId).toBe('req-old');
        // The whole point: no new PDF, no new real eSign-provider call —
        // the previously-completed signature is never touched.
        expect(mockGeneratePdf).not.toHaveBeenCalled();
        expect(mockCreateSignRequest).not.toHaveBeenCalled();
    });

    test('a SIGNED application with no stored signed_agreement_s3_key fails loudly instead of silently regenerating', async () => {
        mockLoanApplicationsFindUniqueOrThrow.mockResolvedValue(applicationRow({
            esign_request_id: 'req-old', esign_status: 'SIGNED', signed_agreement_s3_key: null,
        }));

        await expect(
            cdlLoansService.generateAgreement(APPLICATION_ID, OWNER_ID, ROLE.CUSTOMER),
        ).rejects.toThrow(ConflictError);
        expect(mockCreateSignRequest).not.toHaveBeenCalled();
    });
});

describe('generateAgreement — already PENDING is rejected, not silently duplicated', () => {
    test('a request already in progress (PENDING) throws ConflictError rather than issuing a second one', async () => {
        mockLoanApplicationsFindUniqueOrThrow.mockResolvedValue(applicationRow({
            esign_request_id: 'req-old', esign_status: 'PENDING',
        }));

        await expect(
            cdlLoansService.generateAgreement(APPLICATION_ID, OWNER_ID, ROLE.CUSTOMER),
        ).rejects.toThrow(ConflictError);

        // Must reject BEFORE touching the PDF generator or eSign provider
        // — no wasted real provider call, no second confusing link.
        expect(mockGeneratePdf).not.toHaveBeenCalled();
        expect(mockCreateSignRequest).not.toHaveBeenCalled();
    });
});

describe('generateAgreement — a dead-end prior request (FAILED/EXPIRED/CANCELLED) is NOT blocked', () => {
    test.each(['FAILED', 'EXPIRED', 'CANCELLED'])('status %s allows a fresh agreement to be generated', async (status) => {
        mockLoanApplicationsFindUniqueOrThrow.mockResolvedValue(applicationRow({
            esign_request_id: 'req-old', esign_status: status,
        }));

        const result = await cdlLoansService.generateAgreement(APPLICATION_ID, OWNER_ID, ROLE.CUSTOMER);

        expect(result.status).toBe('GENERATED');
        expect(result.eSignRequestId).toBe('req-new');
        expect(mockCreateSignRequest).toHaveBeenCalledTimes(1);
    });
});

describe('generateAgreement — regression: a brand-new application (no prior request) is unaffected', () => {
    test('generates a real agreement + eSign request as before', async () => {
        mockLoanApplicationsFindUniqueOrThrow.mockResolvedValue(applicationRow());

        const result = await cdlLoansService.generateAgreement(APPLICATION_ID, OWNER_ID, ROLE.CUSTOMER);

        expect(result.status).toBe('GENERATED');
        expect(mockGeneratePdf).toHaveBeenCalledTimes(1);
        expect(mockCreateSignRequest).toHaveBeenCalledTimes(1);
    });

    test('Aadhaar-incomplete applicants are still rejected the same way as before', async () => {
        mockLoanApplicationsFindUniqueOrThrow.mockResolvedValue(applicationRow());
        mockKycDocumentsFindUnique.mockResolvedValue({ aadhaar_encrypted: null });

        await expect(
            cdlLoansService.generateAgreement(APPLICATION_ID, OWNER_ID, ROLE.CUSTOMER),
        ).rejects.toThrow(ValidationError);
    });
});
