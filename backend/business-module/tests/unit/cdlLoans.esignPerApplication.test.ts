// tests/unit/cdlLoans.esignPerApplication.test.ts
//
// Regression test for the eSign/eStamp per-user-vs-per-application bug
// (see commit 919f711 and the migration that followed it,
// 20260806040000_move_esign_to_loan_applications).
//
// Before this fix, esign_status/estamp_status lived on kyc_documents —
// ONE ROW PER USER. disburseToMerchant's gate checked that shared row, so
// a customer's already-signed first loan silently satisfied the
// disbursement gate for a second, brand-new, never-signed application.
// Reproduced live: app #1 signed+disbursed correctly; app #2 (same
// customer, agreement never generated) disbursed anyway.
//
// These tests assert the gate now reads loan_applications, keyed by
// applicationId — not kyc_documents, keyed by user_id — using two
// applications that belong to the SAME customer with DIFFERENT
// agreement states, which is exactly the scenario the old code got wrong.

const mockFindApplicationByIdOrThrow = jest.fn();
const mockCreateAccount = jest.fn();

jest.mock('@/modules/loans/loans.repository', () => ({
    loansRepository: {
        findApplicationByIdOrThrow: (...args: unknown[]) => mockFindApplicationByIdOrThrow(...args),
        createAccount: (...args: unknown[]) => mockCreateAccount(...args),
        findCustomerByUserId: jest.fn(),
        updateApplicationStatus: jest.fn(),
    },
}));

const mockLoanApplicationsFindUnique = jest.fn();
const mockLoanApplicationsFindUniqueOrThrow = jest.fn();
const mockLoanApplicationsUpdate = jest.fn();
const mockKycDocumentsFindUnique = jest.fn();
const mockCustomersFindUnique = jest.fn();
const mockDisbursementsCreate = jest.fn();
const mockDisbursementsUpdate = jest.fn();

jest.mock('@/config/database', () => ({
    prisma: {
        loan_applications: {
            findUnique: (...args: unknown[]) => mockLoanApplicationsFindUnique(...args),
            findUniqueOrThrow: (...args: unknown[]) => mockLoanApplicationsFindUniqueOrThrow(...args),
            update: (...args: unknown[]) => mockLoanApplicationsUpdate(...args),
        },
        kyc_documents: {
            findUnique: (...args: unknown[]) => mockKycDocumentsFindUnique(...args),
        },
        customers: {
            findUnique: (...args: unknown[]) => mockCustomersFindUnique(...args),
        },
        disbursements: {
            create: (...args: unknown[]) => mockDisbursementsCreate(...args),
            update: (...args: unknown[]) => mockDisbursementsUpdate(...args),
        },
    },
}));

const mockCreateSchedule = jest.fn();
jest.mock('@/modules/emi', () => ({
    emiService: { createSchedule: (...args: unknown[]) => mockCreateSchedule(...args) },
}));

const mockCreatePayout = jest.fn();
jest.mock('@/providers', () => ({
    getPaymentProvider: () => ({ createPayout: (...args: unknown[]) => mockCreatePayout(...args) }),
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

import { cdlLoansService } from '@/modules/cdlLoans/cdlLoans.service';
import { ValidationError } from '@/errors';

// Same customer, two different loan applications — this is the crux of
// the bug: both share userId 'user-1', but must be gated independently.
const APP_1 = 'app-11111111-1111-1111-1111-111111111111';
const APP_2 = 'app-22222222-2222-2222-2222-222222222222';
const USER_ID = 'user-1';

function approvedApplication(overrides: Partial<Record<string, unknown>> = {}) {
    return {
        id: APP_1,
        userId: USER_ID,
        approvedAmount: 25000,
        interestRate: 13,
        tenureMonths: 12,
        processingFee: 1463,
        ...overrides,
    };
}

describe('CDL disburseToMerchant — eSign/eStamp gate is per-application', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockCreateAccount.mockResolvedValue({ id: 'account-1' });
        mockCreateSchedule.mockResolvedValue(undefined);
        mockDisbursementsCreate.mockResolvedValue({ id: 'disb-1', utr_number: null, completed_at: null });
        mockCreatePayout.mockResolvedValue({ status: 'DONE', utrNumber: 'UTR123', payoutId: 'payout-1' });
        mockDisbursementsUpdate.mockResolvedValue({ id: 'disb-1', status: 'COMPLETED' });
    });

    test('(a) app #1: fully signed + eStamped for THIS application — disburses successfully', async () => {
        mockFindApplicationByIdOrThrow.mockResolvedValue(approvedApplication({ id: APP_1 }));
        mockLoanApplicationsFindUnique.mockResolvedValue({ esign_status: 'SIGNED', estamp_status: 'APPLIED' });

        const result = await cdlLoansService.disburseToMerchant(APP_1, {
            merchantName: 'Mobile World', amount: 24500, initiatedBy: 'finance-1',
        });

        expect(mockLoanApplicationsFindUnique).toHaveBeenCalledWith(
            expect.objectContaining({ where: { id: APP_1 } }),
        );
        expect(result.status).toBe('COMPLETED');
    });

    test('(b) app #2: same customer as app #1, but its OWN agreement was never generated — disbursement is REJECTED, not silently allowed by app #1\'s signed status', async () => {
        mockFindApplicationByIdOrThrow.mockResolvedValue(approvedApplication({ id: APP_2, userId: USER_ID }));
        // app #2's own row has never been signed — this is what the gate
        // must actually check. Under the old (buggy) code, this function
        // queried kyc_documents by user_id and would have found app #1's
        // SIGNED/APPLIED status instead, since both applications share
        // the same customer.
        mockLoanApplicationsFindUnique.mockResolvedValue({ esign_status: null, estamp_status: null });

        await expect(
            cdlLoansService.disburseToMerchant(APP_2, {
                merchantName: 'Cool Store', amount: 24500, initiatedBy: 'finance-1',
            }),
        ).rejects.toThrow(ValidationError);

        // Must reject BEFORE any money moves.
        expect(mockCreatePayout).not.toHaveBeenCalled();
        expect(mockDisbursementsCreate).not.toHaveBeenCalled();
    });

    test('(c) app #2 completes its OWN independent agreement/eSign/eStamp — then disburses correctly, without app #1 ever being touched', async () => {
        // ── generateAgreement for app #2 ──────────────────────────────
        mockLoanApplicationsFindUniqueOrThrow.mockResolvedValue(approvedApplication({ id: APP_2, userId: USER_ID }));
        mockKycDocumentsFindUnique.mockResolvedValue({ aadhaar_encrypted: 'ciphertext' });
        mockGeneratePdf.mockResolvedValue(Buffer.from('pdf'));
        mockUpload.mockResolvedValue({ key: 'agreements/cdl/app-2.pdf', eTag: 'etag' });
        mockGetSignedUrl.mockResolvedValue({ url: 'https://stub/agreements/app-2.pdf', expiresAt: new Date() });
        mockDecrypt.mockResolvedValue('999912345678');
        mockCreateSignRequest.mockResolvedValue({
            requestId: 'req-app-2', signingUrl: 'https://stub/sign/req-app-2', status: 'PENDING', expiresAt: new Date(),
        });

        await cdlLoansService.generateAgreement(APP_2);

        // Must write to loan_applications by id, never to kyc_documents.
        expect(mockLoanApplicationsUpdate).toHaveBeenCalledWith({
            where: { id: APP_2 },
            data: expect.objectContaining({ esign_request_id: 'req-app-2', esign_status: 'PENDING' }),
        });

        // ── completeESign for app #2 ───────────────────────────────────
        mockLoanApplicationsFindUniqueOrThrow.mockResolvedValue(
            approvedApplication({ id: APP_2, userId: USER_ID, esign_request_id: 'req-app-2' }),
        );
        mockGetSignStatus.mockResolvedValue({ status: 'SIGNED' });
        mockCustomersFindUnique.mockResolvedValue({ state: 'Karnataka' });
        mockApplyEStamp.mockResolvedValue({ stampId: 'stamp-app-2', status: 'APPLIED', stampDutyRupees: 25 });
        mockGetSignedDocument.mockResolvedValue({ documentBase64: Buffer.from('signed-pdf').toString('base64') });

        const signResult = await cdlLoansService.completeESign(APP_2);

        expect(signResult.status).toBe('SIGNED');
        expect(mockLoanApplicationsUpdate).toHaveBeenCalledWith({
            where: { id: APP_2 },
            data: expect.objectContaining({ esign_status: 'SIGNED', estamp_id: 'stamp-app-2', estamp_status: 'APPLIED' }),
        });

        // ── disburseToMerchant for app #2 — must succeed on its own state ──
        mockFindApplicationByIdOrThrow.mockResolvedValue(approvedApplication({ id: APP_2, userId: USER_ID }));
        mockLoanApplicationsFindUnique.mockResolvedValue({ esign_status: 'SIGNED', estamp_status: 'APPLIED' });

        const disburseResult = await cdlLoansService.disburseToMerchant(APP_2, {
            merchantName: 'Cool Store', amount: 24500, initiatedBy: 'finance-1',
        });

        expect(disburseResult.status).toBe('COMPLETED');
        // app #1 was never queried or written to during any of this.
        expect(mockLoanApplicationsFindUnique).not.toHaveBeenCalledWith(
            expect.objectContaining({ where: { id: APP_1 } }),
        );
        expect(mockLoanApplicationsUpdate).not.toHaveBeenCalledWith(
            expect.objectContaining({ where: { id: APP_1 } }),
        );
    });
});
