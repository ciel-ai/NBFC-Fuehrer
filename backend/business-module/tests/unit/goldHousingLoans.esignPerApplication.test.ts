// tests/unit/goldHousingLoans.esignPerApplication.test.ts
//
// Regression test for the eSign/eStamp per-user-vs-per-application bug in
// goldLoans.service.ts and housingLoans.service.ts (see commit 919f711
// and the migration that followed it,
// 20260806040000_move_esign_to_loan_applications).
//
// Before this fix, generateAgreement/completeESign (gold) and
// generateAgreement/eSign (housing) wrote esign_status/estamp_status to
// kyc_documents keyed by user_id — the same per-user table CDL and the
// shared disbursement gate had the bug against. These tests assert both
// products now write to loan_applications, keyed by applicationId, and
// (for housing) that the write shape is exactly what the shared
// disbursement.service.ts gate reads (tested separately in
// disbursement.esignPerApplication.test.ts) — a mismatched write-side
// would cause a false-negative rejection of a legitimately-signed loan,
// not a bypass, but it's just as real a break.

const mockLoanApplicationsFindUniqueOrThrow = jest.fn();
const mockLoanApplicationsUpdate = jest.fn();
const mockKycDocumentsFindUnique = jest.fn();
const mockCustomersFindUnique = jest.fn();

jest.mock('@/config/database', () => ({
    prisma: {
        loan_applications: {
            findUniqueOrThrow: (...args: unknown[]) => mockLoanApplicationsFindUniqueOrThrow(...args),
            update: (...args: unknown[]) => mockLoanApplicationsUpdate(...args),
        },
        kyc_documents: {
            findUnique: (...args: unknown[]) => mockKycDocumentsFindUnique(...args),
        },
        customers: {
            findUnique: (...args: unknown[]) => mockCustomersFindUnique(...args),
        },
    },
}));

const mockGenerateGoldPdf = jest.fn();
const mockGenerateHousingPdf = jest.fn();
jest.mock('@/modules/documents/pdf.service', () => ({
    pdfService: {
        generateGoldLoanAgreement: (...args: unknown[]) => mockGenerateGoldPdf(...args),
        generateHousingLoanAgreement: (...args: unknown[]) => mockGenerateHousingPdf(...args),
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

const mockDecrypt = jest.fn();
jest.mock('@/providers/encryption', () => ({
    getEncryptionProvider: () => ({ decrypt: (...args: unknown[]) => mockDecrypt(...args) }),
}));

const mockCreateSignRequest = jest.fn();
const mockGetSignStatus = jest.fn();
const mockApplyEStamp = jest.fn();
const mockGetSignedDocument = jest.fn();
jest.mock('@/providers/esign', () => ({
    getESignProvider: () => ({
        createSignRequest: (...args: unknown[]) => mockCreateSignRequest(...args),
        getSignStatus: (...args: unknown[]) => mockGetSignStatus(...args),
        applyEStamp: (...args: unknown[]) => mockApplyEStamp(...args),
        getSignedDocument: (...args: unknown[]) => mockGetSignedDocument(...args),
    }),
}));

// Unused by generateAgreement/completeESign/eSign, but statically imported
// by both service files — stubbed out so the module graph loads.
jest.mock('@/modules/loans/loans.repository', () => ({ loansRepository: {} }));
jest.mock('@/modules/emi', () => ({ emiService: {} }));
jest.mock('@/modules/emi/emi.calculator', () => ({ computeMonthlyEmi: jest.fn() }));
jest.mock('@/modules/disbursement', () => ({ disbursementService: {} }));
jest.mock('@/modules/payments', () => ({ paymentsService: {} }));
jest.mock('@/utils/loanStateMachine.util', () => ({ assertTransition: jest.fn() }));
jest.mock('@/utils/ownership.util', () => ({ assertOwnsResource: jest.fn(), assertAccountOwnership: jest.fn() }));
jest.mock('@/modules/goldLoans/goldLoans.repository', () => ({ goldLoansRepository: {} }));
jest.mock('@/modules/housingLoans/housingLoans.repository', () => ({ housingLoansRepository: {} }));

import { goldLoansService } from '@/modules/goldLoans/goldLoans.service';
import { housingLoansService } from '@/modules/housingLoans/housingLoans.service';

const GOLD_APP = 'gold-app-1';
const HOUSING_APP = 'housing-app-1';
const USER_ID = 'user-shared-1';

function baseApplication(id: string, overrides: Partial<Record<string, unknown>> = {}) {
    return {
        id,
        user_id: USER_ID,
        approved_amount: 100000,
        amount_requested: 100000,
        tenure_months: 12,
        status: 'PENDING_APPROVAL',
        ...overrides,
    };
}

describe('goldLoansService.generateAgreement/completeESign — writes to loan_applications, not kyc_documents', () => {
    beforeEach(() => jest.clearAllMocks());

    test('generateAgreement writes esign_request_id/esign_status to loan_applications, keyed by applicationId', async () => {
        mockLoanApplicationsFindUniqueOrThrow.mockResolvedValue(baseApplication(GOLD_APP, { user: { full_name: 'Test', phone: '9999999999' } }));
        mockKycDocumentsFindUnique.mockResolvedValue({ aadhaar_encrypted: 'ciphertext' });
        mockGenerateGoldPdf.mockResolvedValue(Buffer.from('pdf'));
        mockUpload.mockResolvedValue({ key: 'agreements/gold/gold-app-1.pdf', eTag: 'etag' });
        mockGetSignedUrl.mockResolvedValue({ url: 'https://stub/agreements/gold-app-1.pdf', expiresAt: new Date() });
        mockDecrypt.mockResolvedValue('999912345678');
        mockCreateSignRequest.mockResolvedValue({
            requestId: 'req-gold-1', signingUrl: 'https://stub/sign/req-gold-1', status: 'PENDING', expiresAt: new Date(),
        });

        await goldLoansService.generateAgreement(GOLD_APP);

        expect(mockLoanApplicationsUpdate).toHaveBeenCalledWith({
            where: { id: GOLD_APP },
            data: expect.objectContaining({ esign_request_id: 'req-gold-1', esign_status: 'PENDING' }),
        });
        // Never falls back to writing kyc_documents for this data.
        expect(mockKycDocumentsFindUnique).toHaveBeenCalledWith(
            expect.objectContaining({ where: { user_id: USER_ID }, select: { aadhaar_encrypted: true } }),
        );
    });

    test('completeESign writes esign_status/estamp_id/estamp_status to loan_applications, keyed by applicationId', async () => {
        mockLoanApplicationsFindUniqueOrThrow.mockResolvedValue(
            baseApplication(GOLD_APP, { esign_request_id: 'req-gold-1' }),
        );
        mockGetSignStatus.mockResolvedValue({ status: 'SIGNED' });
        mockCustomersFindUnique.mockResolvedValue({ state: 'Karnataka' });
        mockApplyEStamp.mockResolvedValue({ stampId: 'stamp-gold-1', status: 'APPLIED', stampDutyRupees: 100 });
        mockGetSignedDocument.mockResolvedValue({ documentBase64: Buffer.from('signed').toString('base64') });

        const result = await goldLoansService.completeESign(GOLD_APP, '000000');

        expect(result.status).toBe('SIGNED');
        expect(mockLoanApplicationsUpdate).toHaveBeenCalledWith({
            where: { id: GOLD_APP },
            data: expect.objectContaining({
                esign_status: 'SIGNED',
                estamp_id: 'stamp-gold-1',
                estamp_status: 'APPLIED',
            }),
        });
    });
});

describe('housingLoansService.generateAgreement/eSign — writes to loan_applications, not kyc_documents (regression: must match what the shared disbursement gate reads)', () => {
    beforeEach(() => jest.clearAllMocks());

    test('generateAgreement writes esign_request_id/esign_status to loan_applications, keyed by applicationId', async () => {
        mockLoanApplicationsFindUniqueOrThrow.mockResolvedValue(baseApplication(HOUSING_APP, { user: { full_name: 'Test', phone: '9999999999' } }));
        mockKycDocumentsFindUnique.mockResolvedValue({ aadhaar_encrypted: 'ciphertext' });
        mockGenerateHousingPdf.mockResolvedValue(Buffer.from('pdf'));
        mockUpload.mockResolvedValue({ key: 'agreements/housing/housing-app-1.pdf', eTag: 'etag' });
        mockGetSignedUrl.mockResolvedValue({ url: 'https://stub/agreements/housing-app-1.pdf', expiresAt: new Date() });
        mockDecrypt.mockResolvedValue('999912345678');
        mockCreateSignRequest.mockResolvedValue({
            requestId: 'req-housing-1', signingUrl: 'https://stub/sign/req-housing-1', status: 'PENDING', expiresAt: new Date(),
        });

        await housingLoansService.generateAgreement(HOUSING_APP);

        expect(mockLoanApplicationsUpdate).toHaveBeenCalledWith({
            where: { id: HOUSING_APP },
            data: expect.objectContaining({ esign_request_id: 'req-housing-1', esign_status: 'PENDING' }),
        });
    });

    test('eSign() writes esign_status/estamp_id/estamp_status to loan_applications — same field names/shape the shared disbursement gate reads (previously estamp was computed and discarded entirely for housing loans)', async () => {
        mockLoanApplicationsFindUniqueOrThrow.mockResolvedValue(
            baseApplication(HOUSING_APP, { esign_request_id: 'req-housing-1' }),
        );
        mockGetSignStatus.mockResolvedValue({ status: 'SIGNED' });
        mockApplyEStamp.mockResolvedValue({ stampId: 'stamp-housing-1', status: 'APPLIED', stampDutyRupees: 500 });
        mockGetSignedDocument.mockResolvedValue({ documentBase64: Buffer.from('signed').toString('base64') });

        const result = await housingLoansService.eSign(HOUSING_APP);

        expect(result.status).toBe('SIGNED');
        // These field names are exactly what disbursement.service.ts's
        // Gate 4/4b select()s — see disbursement.esignPerApplication.test.ts.
        expect(mockLoanApplicationsUpdate).toHaveBeenCalledWith({
            where: { id: HOUSING_APP },
            data: expect.objectContaining({
                esign_status: 'SIGNED',
                estamp_id: 'stamp-housing-1',
                estamp_status: 'APPLIED',
            }),
        });
    });
});

// ─── eStamp state-code fix ──────────────────────────────────────────────────
//
// Regression test for the "hardcoded/mis-derived stateCode" go-live blocker:
// goldLoans.service.ts previously derived stateCode via
// customer.state.slice(0, 2).toUpperCase() (wrong for almost every state
// whose name doesn't start with its own code), and housingLoans.service.ts
// hardcoded stateCode: 'KA' unconditionally for every applicant. Both now
// resolve the real applicant state (customers.state) through
// stateCode.util.ts's resolveStateCode(). These tests assert applyEStamp()
// is actually called with different, correct codes for different real
// applicant states — proving it's no longer hardcoded/mis-derived.
describe('eStamp stateCode is derived from the real applicant state, not hardcoded/mis-derived', () => {
    beforeEach(() => jest.clearAllMocks());

    function signedEsignSetup(applicationId: string) {
        mockLoanApplicationsFindUniqueOrThrow.mockResolvedValue(
            baseApplication(applicationId, { esign_request_id: `req-${applicationId}` }),
        );
        mockGetSignStatus.mockResolvedValue({ status: 'SIGNED' });
        mockApplyEStamp.mockResolvedValue({ stampId: `stamp-${applicationId}`, status: 'APPLIED', stampDutyRupees: 100 });
        mockGetSignedDocument.mockResolvedValue({ documentBase64: Buffer.from('signed').toString('base64') });
    }

    test('gold completeESign: "Tamil Nadu" resolves to "TN", not the "Ta" that slice(0,2) would produce', async () => {
        signedEsignSetup(GOLD_APP);
        mockCustomersFindUnique.mockResolvedValue({ state: 'Tamil Nadu' });

        await goldLoansService.completeESign(GOLD_APP, '000000');

        expect(mockApplyEStamp).toHaveBeenCalledWith(
            expect.objectContaining({ stateCode: 'TN' }),
        );
    });

    test('gold completeESign: "Maharashtra" resolves to "MH", proving the code varies with the applicant\'s actual state', async () => {
        signedEsignSetup(GOLD_APP);
        mockCustomersFindUnique.mockResolvedValue({ state: 'Maharashtra' });

        await goldLoansService.completeESign(GOLD_APP, '000000');

        expect(mockApplyEStamp).toHaveBeenCalledWith(
            expect.objectContaining({ stateCode: 'MH' }),
        );
    });

    test('housing eSign: "Tamil Nadu" resolves to "TN", not the hardcoded "KA" every applicant previously got', async () => {
        signedEsignSetup(HOUSING_APP);
        mockCustomersFindUnique.mockResolvedValue({ state: 'Tamil Nadu' });

        await housingLoansService.eSign(HOUSING_APP);

        expect(mockApplyEStamp).toHaveBeenCalledWith(
            expect.objectContaining({ stateCode: 'TN' }),
        );
    });

    test('housing eSign: "Karnataka" resolves to "KA", and a different applicant\'s "Maharashtra" resolves to "MH" — the code is no longer a fixed constant', async () => {
        signedEsignSetup(HOUSING_APP);
        mockCustomersFindUnique.mockResolvedValue({ state: 'Karnataka' });
        await housingLoansService.eSign(HOUSING_APP);
        expect(mockApplyEStamp).toHaveBeenLastCalledWith(
            expect.objectContaining({ stateCode: 'KA' }),
        );

        jest.clearAllMocks();
        signedEsignSetup(HOUSING_APP);
        mockCustomersFindUnique.mockResolvedValue({ state: 'Maharashtra' });
        await housingLoansService.eSign(HOUSING_APP);
        expect(mockApplyEStamp).toHaveBeenLastCalledWith(
            expect.objectContaining({ stateCode: 'MH' }),
        );
    });
});
