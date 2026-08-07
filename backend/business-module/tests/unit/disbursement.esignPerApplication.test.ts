// tests/unit/disbursement.esignPerApplication.test.ts
//
// Regression test for the eSign/eStamp per-user-vs-per-application bug in
// the SHARED disbursement gate used by gold and housing loans (see commit
// 919f711 and the migration that followed it,
// 20260806040000_move_esign_to_loan_applications).
//
// Before this fix, Gate 4 (eSign) / Gate 4b (eStamp) in
// disbursement.service.ts checked kycRepository.findByUserId(loan.userId)
// — ONE ROW PER USER. A customer's already-signed prior loan (any
// product) would silently satisfy these gates for a brand-new,
// never-signed application. These tests use two applications belonging
// to the SAME customer with DIFFERENT agreement states — exactly what
// the old code got wrong — and assert the gates now read
// loan_applications, keyed by applicationId.

const mockFindApplicationByIdOrThrow = jest.fn();
jest.mock('@/modules/loans', () => ({
    loansRepository: { findApplicationByIdOrThrow: (...args: unknown[]) => mockFindApplicationByIdOrThrow(...args) },
    loansService: {},
}));

const mockKycFindByUserId = jest.fn();
jest.mock('@/modules/kyc', () => ({
    kycRepository: { findByUserId: (...args: unknown[]) => mockKycFindByUserId(...args) },
}));

const mockUnderwritingFindLatest = jest.fn();
jest.mock('@/modules/underwriting', () => ({
    underwritingRepository: { findLatestByLoanId: (...args: unknown[]) => mockUnderwritingFindLatest(...args) },
}));

const mockDisbursementExistsCompleted = jest.fn();
const mockDisbursementFindByLoanId = jest.fn();
jest.mock('@/modules/disbursement/disbursement.repository', () => ({
    disbursementRepository: {
        existsCompletedForLoan: (...args: unknown[]) => mockDisbursementExistsCompleted(...args),
        findByLoanId: (...args: unknown[]) => mockDisbursementFindByLoanId(...args),
    },
}));

const mockLoanApplicationsFindUnique = jest.fn();
jest.mock('@/config/database', () => ({
    prisma: {
        loan_applications: { findUnique: (...args: unknown[]) => mockLoanApplicationsFindUnique(...args) },
    },
}));

jest.mock('@/config/redis', () => ({
    getRedisClient: jest.fn(),
    RedisKeys: { disbursementLock: (id: string) => `lock:disburse:${id}` },
    RedisTTL: { DISBURSE_LOCK: 30 },
    acquireLock: jest.fn().mockResolvedValue(true),
    releaseLock: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@/providers', () => ({ getPaymentProvider: jest.fn() }));
jest.mock('@/middlewares', () => ({ setAuditContext: jest.fn() }));
jest.mock('@/modules/emi', () => ({ emiService: {} }));
jest.mock('@/modules/accounting/accounting.service', () => ({ accountingService: {} }));

import { disbursementService } from '@/modules/disbursement/disbursement.service';
import { ESignNotCompletedError, EStampNotAppliedError, DomainError } from '@/errors';
import { LOAN_STATUS, KYC_STATUS } from '@/config/constants';

// Same customer ("user-gold-1"), two different gold loan applications.
const GOLD_APP_1 = 'gold-app-11111111-1111-1111-1111-111111111111';
const GOLD_APP_2 = 'gold-app-22222222-2222-2222-2222-222222222222';
const USER_ID = 'user-gold-1';

function approvedLoan(id: string) {
    return {
        id,
        userId: USER_ID,
        status: LOAN_STATUS.APPROVED,
        approvedAmount: 100000,
        processingFee: null,
        processingFeeGst: null,
    };
}

const completeKyc = { overallStatus: KYC_STATUS.COMPLETE };

describe('disbursement.service.ts Gate 4/4b — eSign/eStamp checks are per-application', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockDisbursementExistsCompleted.mockResolvedValue(false);
        mockKycFindByUserId.mockResolvedValue(completeKyc);
    });

    describe('runChecklist (read-only)', () => {
        test('(a) app #1: SIGNED + APPLIED on its own row — checklist passes', async () => {
            mockFindApplicationByIdOrThrow.mockResolvedValue(approvedLoan(GOLD_APP_1));
            mockLoanApplicationsFindUnique.mockResolvedValue({ esign_status: 'SIGNED', estamp_status: 'APPLIED' });
            mockUnderwritingFindLatest.mockResolvedValue({ decision: 'APPROVED' });
            mockDisbursementFindByLoanId.mockResolvedValue(null);

            const result = await disbursementService.runChecklist(GOLD_APP_1);

            expect(mockLoanApplicationsFindUnique).toHaveBeenCalledWith(
                expect.objectContaining({ where: { id: GOLD_APP_1 } }),
            );
            expect(result.checklist.eSignComplete).toBe(true);
            expect(result.checklist.eStampComplete).toBe(true);
        });

        test('(b) app #2: same customer as app #1, but its OWN row was never signed — checklist FAILS despite app #1 being signed', async () => {
            mockFindApplicationByIdOrThrow.mockResolvedValue(approvedLoan(GOLD_APP_2));
            // app #2's own agreement state — never generated, unlike app #1.
            mockLoanApplicationsFindUnique.mockResolvedValue({ esign_status: null, estamp_status: null });
            mockUnderwritingFindLatest.mockResolvedValue({ decision: 'APPROVED' });
            mockDisbursementFindByLoanId.mockResolvedValue(null);

            const result = await disbursementService.runChecklist(GOLD_APP_2);

            expect(result.checklist.eSignComplete).toBe(false);
            expect(result.checklist.eStampComplete).toBe(false);
            expect(result.passed).toBe(false);
        });
    });

    describe('_executeInitiation Gate 4/4b (via initiateDisbursement)', () => {
        const initInput = {
            loanId: GOLD_APP_2,
            initiatedBy: 'finance-1',
            beneficiaryName: 'Customer',
            accountNumber: '1234567890',
            ifsc: 'HDFC0001234',
            mode: 'IMPS' as const,
        };
        const fakeReq = {} as never;

        test('(b) app #2 not signed on its own row — rejected with ESignNotCompletedError, never reaches accounting/payout', async () => {
            mockFindApplicationByIdOrThrow.mockResolvedValue(approvedLoan(GOLD_APP_2));
            mockLoanApplicationsFindUnique.mockResolvedValue({ esign_status: null, estamp_status: null });

            await expect(
                disbursementService.initiateDisbursement(initInput, fakeReq),
            ).rejects.toThrow(ESignNotCompletedError);
        });

        test('(c) app #2 signed but not yet eStamped on its own row — rejected with EStampNotAppliedError', async () => {
            mockFindApplicationByIdOrThrow.mockResolvedValue(approvedLoan(GOLD_APP_2));
            mockLoanApplicationsFindUnique.mockResolvedValue({ esign_status: 'SIGNED', estamp_status: null });

            await expect(
                disbursementService.initiateDisbursement(initInput, fakeReq),
            ).rejects.toThrow(EStampNotAppliedError);
        });

        test('(a) app #1 fully signed + eStamped on its own row — passes Gate 4/4b and proceeds to Gate 5 (underwriting)', async () => {
            mockFindApplicationByIdOrThrow.mockResolvedValue(approvedLoan(GOLD_APP_1));
            mockLoanApplicationsFindUnique.mockResolvedValue({ esign_status: 'SIGNED', estamp_status: 'APPLIED' });
            // Make Gate 5 fail on purpose — isolates that Gate 4/4b let this
            // through, without needing to mock the entire downstream
            // accounting/payout pipeline for a full success run.
            mockUnderwritingFindLatest.mockResolvedValue(null);

            await expect(
                disbursementService.initiateDisbursement({ ...initInput, loanId: GOLD_APP_1 }, fakeReq),
            ).rejects.toMatchObject({ errorCode: 'UNDERWRITING_NOT_CLEARED' });
        });
    });
});
