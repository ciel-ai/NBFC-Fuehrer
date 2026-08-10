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
//
// Also covers disburseToMerchant's transactionality fix (audit finding
// #4): account creation, EMI schedule generation, and the disbursement's
// initial row are now one atomic transaction (mocked here via a fake
// withTransaction that just invokes the callback with a shared tx mock),
// rather than three separate calls through loansRepository.createAccount/
// emiService.createSchedule/prisma.disbursements.create.

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
const mockLoanApplicationsFindUniqueOrThrow = jest.fn();
const mockLoanApplicationsUpdate = jest.fn();
const mockKycDocumentsFindUnique = jest.fn();
const mockCustomersFindUnique = jest.fn();
// Direct (non-transactional) disbursements.update — only reached on the
// payout-provider-call-failure path (cdlLoans.service.ts's catch block),
// which runs after the creation transaction has already committed.
const mockDisbursementsUpdateDirect = jest.fn();
const mockQueryRaw = jest.fn();

// The transaction's own client — shared across both withTransaction calls
// disburseToMerchant makes (creation, then post-payout status update).
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
            update: (...args: unknown[]) => mockDisbursementsUpdateDirect(...args),
        },
        $queryRaw: (...args: unknown[]) => mockQueryRaw(...args),
    },
    withTransaction: (...args: [(tx: typeof txMock) => Promise<unknown>]) => mockWithTransaction(...args),
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
import { ValidationError, LoanStateError } from '@/errors';
import { ROLE } from '@/config/constants';

// Same customer, two different loan applications — this is the crux of
// the bug: both share userId 'user-1', but must be gated independently.
const APP_1 = 'app-11111111-1111-1111-1111-111111111111';
const APP_2 = 'app-22222222-2222-2222-2222-222222222222';
const USER_ID = 'user-1';
// This file's focus is the per-application eSign/eStamp gate and
// disburseToMerchant's transactionality, not the ownership check (covered
// separately in cdlLoans.ownership.test.ts) — calling as staff bypasses
// ownership regardless of the mocks' field naming here.
const STAFF_CALLER_ID = 'staff-1';
const STAFF_ROLE = ROLE.SUPER_ADMIN;

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
        mockWithTransaction.mockImplementation((callback) => callback(txMock));
        mockQueryRaw.mockResolvedValue([{ current_value: 1 }]);
        // status: 'DISBURSED' matches what the account-creation
        // transaction actually sets — disburseToMerchant reads
        // account.status to activate the loan on sync-complete payouts
        // (assertTransition needs a real, valid current status).
        mockTxLoanAccountsCreate.mockResolvedValue({ id: 'account-1', status: 'DISBURSED' });
        mockTxEmiScheduleCreateMany.mockResolvedValue({ count: 12 });
        mockTxLoanApplicationsUpdate.mockResolvedValue({});
        mockTxDisbursementsCreate.mockResolvedValue({ id: 'disb-1', utr_number: null, completed_at: null });
        mockTxDisbursementsUpdate.mockResolvedValue({ id: 'disb-1', status: 'COMPLETED' });
        mockTxLoanAccountsUpdate.mockResolvedValue({});
        mockCreatePayout.mockResolvedValue({ status: 'DONE', utrNumber: 'UTR123', payoutId: 'payout-1' });
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
        // Account, EMI schedule, and the disbursement's initial row all
        // went through the SAME transaction — the whole point of the fix.
        expect(mockTxLoanAccountsCreate).toHaveBeenCalledTimes(1);
        expect(mockTxEmiScheduleCreateMany).toHaveBeenCalledTimes(1);
        expect(mockTxDisbursementsCreate).toHaveBeenCalledTimes(1);
        expect(result.status).toBe('COMPLETED');
    });

    test('activation guard: assertTransition genuinely rejects activating an account that is not DISBURSED (not just decorative)', async () => {
        // A malformed state that should never happen in practice (the
        // account would normally be DISBURSED at this point) — exercises
        // that assertTransition actually enforces LOAN_TRANSITIONS rather
        // than unconditionally forcing ACTIVE.
        mockFindApplicationByIdOrThrow.mockResolvedValue(approvedApplication({ id: APP_1 }));
        mockLoanApplicationsFindUnique.mockResolvedValue({ esign_status: 'SIGNED', estamp_status: 'APPLIED' });
        mockTxLoanAccountsCreate.mockResolvedValue({ id: 'account-1', status: 'CLOSED' });

        await expect(
            cdlLoansService.disburseToMerchant(APP_1, {
                merchantName: 'Mobile World', amount: 24500, initiatedBy: 'finance-1',
            }),
        ).rejects.toThrow(LoanStateError);

        // assertTransition runs BEFORE the post-payout transaction opens
        // (it guards the whole block), so the disbursement-COMPLETED
        // write and the account activation never happen together —
        // neither the disbursement update nor the account update fires.
        expect(mockTxDisbursementsUpdate).not.toHaveBeenCalled();
        expect(mockTxLoanAccountsUpdate).not.toHaveBeenCalled();
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

        // Must reject BEFORE any money moves or any records are created.
        expect(mockCreatePayout).not.toHaveBeenCalled();
        expect(mockTxLoanAccountsCreate).not.toHaveBeenCalled();
        expect(mockTxDisbursementsCreate).not.toHaveBeenCalled();
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

        await cdlLoansService.generateAgreement(APP_2, STAFF_CALLER_ID, STAFF_ROLE);

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

        const signResult = await cdlLoansService.completeESign(APP_2, STAFF_CALLER_ID, STAFF_ROLE);

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

describe('CDL disburseToMerchant — transactionality (audit finding #4)', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockWithTransaction.mockImplementation((callback) => callback(txMock));
        mockQueryRaw.mockResolvedValue([{ current_value: 1 }]);
        mockFindApplicationByIdOrThrow.mockResolvedValue(approvedApplication({ id: APP_1 }));
        mockLoanApplicationsFindUnique.mockResolvedValue({ esign_status: 'SIGNED', estamp_status: 'APPLIED' });
        mockTxLoanAccountsCreate.mockResolvedValue({ id: 'account-1', status: 'DISBURSED' });
        mockTxEmiScheduleCreateMany.mockResolvedValue({ count: 12 });
        mockTxLoanApplicationsUpdate.mockResolvedValue({});
        mockTxDisbursementsCreate.mockResolvedValue({ id: 'disb-1', utr_number: null, completed_at: null });
        mockTxDisbursementsUpdate.mockResolvedValue({ id: 'disb-1', status: 'COMPLETED' });
        mockTxLoanAccountsUpdate.mockResolvedValue({});
    });

    test('account creation, EMI schedule, and the disbursement row are all created inside ONE transaction call', async () => {
        mockCreatePayout.mockResolvedValue({ status: 'DONE', utrNumber: 'UTR123', payoutId: 'payout-1' });

        await cdlLoansService.disburseToMerchant(APP_1, {
            merchantName: 'Mobile World', amount: 24500, initiatedBy: 'finance-1',
        });

        // Two withTransaction calls total: one for creation, one for the
        // post-payout status update — not three-plus separate bare calls.
        expect(mockWithTransaction).toHaveBeenCalledTimes(2);
    });

    test('if EMI schedule creation fails mid-transaction, the account is NOT left behind — the whole creation call throws before any payout is attempted', async () => {
        mockTxEmiScheduleCreateMany.mockRejectedValue(new Error('DB write failed'));

        await expect(
            cdlLoansService.disburseToMerchant(APP_1, {
                merchantName: 'Mobile World', amount: 24500, initiatedBy: 'finance-1',
            }),
        ).rejects.toThrow('DB write failed');

        // Previously: createAccount (its own separate transaction) would
        // have already committed by this point, leaving a real
        // loan_accounts row with no EMI schedule and no disbursement —
        // permanently stuck at DISBURSED with no recovery path. Now the
        // mocked withTransaction callback throws before returning, so the
        // real Prisma transaction (which this mock stands in for) would
        // never commit any of it — and critically, the payout provider
        // (real money movement) is never even reached.
        expect(mockCreatePayout).not.toHaveBeenCalled();
    });

    test('a synchronous payout failure marks the disbursement FAILED via a direct (post-transaction) update, not a stuck record', async () => {
        mockCreatePayout.mockRejectedValue(new Error('provider timeout'));
        mockDisbursementsUpdateDirect.mockResolvedValue({ id: 'disb-1', status: 'FAILED' });

        await expect(
            cdlLoansService.disburseToMerchant(APP_1, {
                merchantName: 'Mobile World', amount: 24500, initiatedBy: 'finance-1',
            }),
        ).rejects.toThrow('CDL merchant payout failed');

        // The creation transaction already committed by this point (real
        // account + schedule + PENDING disbursement genuinely exist) —
        // this asserts the failure is recorded on that same real row via
        // a direct update, not silently dropped, and that the second
        // (post-payout) transaction for account activation never opens.
        expect(mockDisbursementsUpdateDirect).toHaveBeenCalledWith({
            where: { id: 'disb-1' },
            data: expect.objectContaining({ status: 'FAILED' }),
        });
        expect(mockTxLoanAccountsUpdate).not.toHaveBeenCalled();
    });
});
