// tests/unit/disbursement.completeDisbursement.test.ts
//
// Regression/fix coverage for the CDL async-disbursement gap found during
// Part 1's investigation and fixed here: _completeDisbursement previously
// assumed a loan_accounts row never exists yet, which is only true for
// gold/housing. For CDL (which creates the account synchronously, inline,
// in disburseToMerchant, before the payout is even confirmed), that
// assumption caused a second tx.loan_accounts.create() to collide with
// application_id's unique constraint — the whole transaction (including
// the disbursement-COMPLETED update and the GL posting) rolled back,
// Razorpay retried the identical failure for ~24h, and the disbursement
// stayed permanently stuck at INITIATED.
//
// These tests exercise the real processPayoutWebhook entry point (not the
// private path methods directly) — the same call path a real Razorpay
// payout webhook takes.

const mockAcquireLock = jest.fn();
const mockReleaseLock = jest.fn();
jest.mock('@/config/redis', () => ({
    getRedisClient: jest.fn(),
    RedisKeys: {
        webhookProcessed: (id: string) => `wh:done:${id}`,
        disbursementLock: (id: string) => `lock:disburse:${id}`,
    },
    RedisTTL: { DISBURSE_LOCK: 30, CRON_JOB_LOCK: 60 },
    acquireLock: (...args: unknown[]) => mockAcquireLock(...args),
    releaseLock: (...args: unknown[]) => mockReleaseLock(...args),
}));

const mockFindByPayoutId = jest.fn();
const mockFindByIdOrThrow = jest.fn();
jest.mock('@/modules/disbursement/disbursement.repository', () => ({
    disbursementRepository: {
        findByPayoutId: (...args: unknown[]) => mockFindByPayoutId(...args),
        findByIdOrThrow: (...args: unknown[]) => mockFindByIdOrThrow(...args),
        markReversed: jest.fn(),
        markFailed: jest.fn(),
    },
}));

const mockEventsCompleted = jest.fn();
jest.mock('@/modules/disbursement/disbursement.events', () => ({
    disbursementEvents: {
        completed: (...args: unknown[]) => mockEventsCompleted(...args),
        failed: jest.fn(),
        initiated: jest.fn(),
    },
}));

jest.mock('@/modules/kyc', () => ({ kycRepository: {} }));

const mockFindApplicationByIdOrThrow = jest.fn();
const mockFindAccountByApplicationId = jest.fn();
jest.mock('@/modules/loans', () => ({
    loansRepository: {
        findApplicationByIdOrThrow: (...args: unknown[]) => mockFindApplicationByIdOrThrow(...args),
        findAccountByApplicationId: (...args: unknown[]) => mockFindAccountByApplicationId(...args),
    },
    loansService: {},
}));

const mockFindLatestByLoanId = jest.fn();
jest.mock('@/modules/underwriting', () => ({
    underwritingRepository: { findLatestByLoanId: (...args: unknown[]) => mockFindLatestByLoanId(...args) },
}));

const mockCreateSchedule = jest.fn();
jest.mock('@/modules/emi', () => ({
    emiService: { createSchedule: (...args: unknown[]) => mockCreateSchedule(...args) },
}));

const mockPostDisbursement = jest.fn();
jest.mock('@/modules/accounting/accounting.service', () => ({
    accountingService: { postDisbursement: (...args: unknown[]) => mockPostDisbursement(...args) },
}));

jest.mock('@/providers', () => ({ getPaymentProvider: jest.fn() }));
jest.mock('@/utils/referenceNumber.util', () => ({
    generateLoanAccountNumber: jest.fn().mockResolvedValue('CDL-ACC-0001'),
}));
jest.mock('@/middlewares', () => ({ setAuditContext: jest.fn() }));

// tx mock — used for BOTH paths inside prisma.$transaction(async (tx) => {...})
const mockTxLoanAccountsCreate = jest.fn();
const mockTxLoanAccountsUpdate = jest.fn();
const mockTxEnachMandatesFindFirst = jest.fn();
const mockTxLoanApplicationsUpdate = jest.fn();
const mockTxDisbursementsUpdate = jest.fn();
const mockPrismaTransaction = jest.fn();
const mockPrismaLoanAccountsUpdate = jest.fn();

jest.mock('@/config/database', () => ({
    prisma: {
        $transaction: (...args: unknown[]) => mockPrismaTransaction(...args),
        loan_accounts: { update: (...args: unknown[]) => mockPrismaLoanAccountsUpdate(...args) },
    },
}));

import { disbursementService } from '@/modules/disbursement/disbursement.service';
import { PRODUCT_TYPE } from '@/config/constants';

const CDL_APP_ID = 'cdl-app-1';
const GOLD_APP_ID = 'gold-app-1';
const HOUSING_APP_ID = 'housing-app-1';
const USER_ID = 'user-1';
const PAYOUT_ID = 'payout-razorpay-1';

const tx = {
    loan_accounts: { create: mockTxLoanAccountsCreate, update: mockTxLoanAccountsUpdate },
    enach_mandates: { findFirst: mockTxEnachMandatesFindFirst },
    loan_applications: { update: mockTxLoanApplicationsUpdate },
    disbursements: { update: mockTxDisbursementsUpdate },
};

function webhookInput(overrides: Partial<{ razorpayPayoutId: string; status: string; utrNumber: string | null; failureReason: string | null }> = {}) {
    return {
        razorpayPayoutId: PAYOUT_ID,
        status: 'processed',
        utrNumber: 'UTR-XYZ-1',
        failureReason: null,
        ...overrides,
    };
}

function disbursementRecord(overrides: Partial<Record<string, unknown>> = {}) {
    return {
        id: 'disb-1',
        loanId: CDL_APP_ID,
        loanAccountId: null,
        userId: USER_ID,
        principalAmount: 25000,
        netDisbursedAmount: 24500,
        status: 'INITIATED',
        initiatedBy: 'finance-1',
        razorpayPayoutId: PAYOUT_ID,
        ...overrides,
    };
}

function application(overrides: Partial<Record<string, unknown>> = {}) {
    return {
        id: CDL_APP_ID,
        userId: USER_ID,
        agentId: null,
        productType: PRODUCT_TYPE.CONSUMER_DURABLE,
        tenureMonths: 12,
        ...overrides,
    };
}

const fakeReq = { requestId: 'req-1' } as never;

describe('processPayoutWebhook — CDL async completion (Path A: account already exists)', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockAcquireLock.mockResolvedValue(true);
        mockFindByIdOrThrow.mockResolvedValue({
            id: 'disb-1', loanId: CDL_APP_ID, loanAccountId: 'account-1', status: 'COMPLETED',
            principalAmount: 25000, processingFee: 0, netDisbursedAmount: 24500, mode: 'UPI',
            utrNumber: 'UTR-XYZ-1', failureReason: null, initiatedAt: new Date(), completedAt: new Date(),
        });
        mockTxDisbursementsUpdate.mockResolvedValue({});
        mockPostDisbursement.mockResolvedValue(undefined);
        mockTxLoanAccountsUpdate.mockResolvedValue({});
        mockTxLoanApplicationsUpdate.mockResolvedValue({});
        mockPrismaTransaction.mockImplementation(async (callback: (tx: unknown) => Promise<void>) => callback(tx));
    });

    test('exactly one loan_accounts row exists after completion — no second create attempted', async () => {
        mockFindByPayoutId.mockResolvedValue(disbursementRecord());
        mockFindApplicationByIdOrThrow.mockResolvedValue(application());
        mockFindAccountByApplicationId.mockResolvedValue({
            id: 'account-1', applicationId: CDL_APP_ID, userId: USER_ID,
            accountNumber: 'CDL-0001', principalAmount: 25000, interestRate: 13,
            tenureMonths: 12, monthlyEmi: 2233, status: 'DISBURSED',
        });

        await disbursementService.processPayoutWebhook(webhookInput(), fakeReq);

        // The critical assertion: no new account is ever created.
        expect(mockTxLoanAccountsCreate).not.toHaveBeenCalled();
        // Nor is a fresh EMI schedule — CDL's synchronous disburseToMerchant
        // already built one.
        expect(mockCreateSchedule).not.toHaveBeenCalled();
    });

    test('disbursement is marked COMPLETED with the real UTR', async () => {
        mockFindByPayoutId.mockResolvedValue(disbursementRecord());
        mockFindApplicationByIdOrThrow.mockResolvedValue(application());
        mockFindAccountByApplicationId.mockResolvedValue({
            id: 'account-1', status: 'DISBURSED', accountNumber: 'CDL-0001',
            principalAmount: 25000, interestRate: 13, tenureMonths: 12, monthlyEmi: 2233,
        });

        await disbursementService.processPayoutWebhook(webhookInput({ utrNumber: 'UTR-REAL-1' }), fakeReq);

        expect(mockTxDisbursementsUpdate).toHaveBeenCalledWith({
            where: { id: 'disb-1' },
            data: expect.objectContaining({ status: 'COMPLETED', utr_number: 'UTR-REAL-1', loan_account_id: 'account-1' }),
        });
    });

    test('loan_accounts.status moves DISBURSED -> ACTIVE', async () => {
        mockFindByPayoutId.mockResolvedValue(disbursementRecord());
        mockFindApplicationByIdOrThrow.mockResolvedValue(application());
        mockFindAccountByApplicationId.mockResolvedValue({
            id: 'account-1', status: 'DISBURSED', accountNumber: 'CDL-0001',
            principalAmount: 25000, interestRate: 13, tenureMonths: 12, monthlyEmi: 2233,
        });

        await disbursementService.processPayoutWebhook(webhookInput(), fakeReq);

        expect(mockTxLoanAccountsUpdate).toHaveBeenCalledWith({
            where: { id: 'account-1' },
            data: expect.objectContaining({ status: 'ACTIVE' }),
        });
    });

    test('accountingService.postDisbursement is called exactly once with the correct amount — the fix for the pre-existing CDL GL-posting gap', async () => {
        mockFindByPayoutId.mockResolvedValue(disbursementRecord({ principalAmount: 25000 }));
        mockFindApplicationByIdOrThrow.mockResolvedValue(application());
        mockFindAccountByApplicationId.mockResolvedValue({
            id: 'account-1', status: 'DISBURSED', accountNumber: 'CDL-0001',
            principalAmount: 25000, interestRate: 13, tenureMonths: 12, monthlyEmi: 2233,
        });

        await disbursementService.processPayoutWebhook(webhookInput(), fakeReq);

        expect(mockPostDisbursement).toHaveBeenCalledTimes(1);
        expect(mockPostDisbursement).toHaveBeenCalledWith(
            expect.objectContaining({
                disbursementId: 'disb-1',
                loanAccountId: 'account-1',
                productType: PRODUCT_TYPE.CONSUMER_DURABLE,
                amount: 25000,
            }),
            tx,
        );
    });

    test('activation is guarded, not forced — an account already ACTIVE is left alone (no redundant transition attempt)', async () => {
        mockFindByPayoutId.mockResolvedValue(disbursementRecord());
        mockFindApplicationByIdOrThrow.mockResolvedValue(application());
        mockFindAccountByApplicationId.mockResolvedValue({
            id: 'account-1', status: 'ACTIVE', accountNumber: 'CDL-0001',
            principalAmount: 25000, interestRate: 13, tenureMonths: 12, monthlyEmi: 2233,
        });

        await disbursementService.processPayoutWebhook(webhookInput(), fakeReq);

        expect(mockTxLoanAccountsUpdate).not.toHaveBeenCalled();
    });
});

describe('processPayoutWebhook — CDL sync-complete regression (2a\'s path)', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockAcquireLock.mockResolvedValue(true);
    });

    test('_completeDisbursement (and everything it does) is never reached when the record is already COMPLETED — the top-level idempotency check catches it first', async () => {
        mockFindByPayoutId.mockResolvedValue(disbursementRecord({ status: 'COMPLETED' }));

        await disbursementService.processPayoutWebhook(webhookInput(), fakeReq);

        expect(mockFindApplicationByIdOrThrow).not.toHaveBeenCalled();
        expect(mockFindAccountByApplicationId).not.toHaveBeenCalled();
        expect(mockTxLoanAccountsCreate).not.toHaveBeenCalled();
        expect(mockPostDisbursement).not.toHaveBeenCalled();
    });
});

describe('processPayoutWebhook — gold loan async completion (Path B: no account yet, ACTIVE directly)', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockAcquireLock.mockResolvedValue(true);
        mockFindAccountByApplicationId.mockResolvedValue(null); // no pre-existing account — gold's normal case
        mockFindLatestByLoanId.mockResolvedValue({ recommendedRate: 18 });
        mockTxEnachMandatesFindFirst.mockResolvedValue(null);
        mockTxLoanAccountsCreate.mockResolvedValue({
            id: 'gold-account-1', application_id: GOLD_APP_ID, user_id: USER_ID,
            account_number: 'GOLD-0001', principal_amount: 100000, interest_rate: 18,
            tenure_months: 12, outstanding_balance: 100000, created_at: new Date(), updated_at: new Date(),
        });
        mockTxLoanApplicationsUpdate.mockResolvedValue({});
        mockTxDisbursementsUpdate.mockResolvedValue({});
        mockPostDisbursement.mockResolvedValue(undefined);
        mockPrismaTransaction.mockImplementation(async (callback: (tx: unknown) => Promise<void>) => callback(tx));
        mockCreateSchedule.mockResolvedValue({ monthlyEmi: 9200, totalInterest: 10400, totalPayable: 110400, firstEmiDate: new Date() });
        mockPrismaLoanAccountsUpdate.mockResolvedValue({});
        mockFindByIdOrThrow.mockResolvedValue({
            id: 'disb-1', loanId: GOLD_APP_ID, loanAccountId: 'gold-account-1', status: 'COMPLETED',
            principalAmount: 100000, processingFee: 0, netDisbursedAmount: 100000, mode: 'IMPS',
            utrNumber: 'UTR-GOLD-1', failureReason: null, initiatedAt: new Date(), completedAt: new Date(),
        });
    });

    test('creates a fresh account directly as ACTIVE — never sits at DISBURSED', async () => {
        mockFindByPayoutId.mockResolvedValue(disbursementRecord({ loanId: GOLD_APP_ID, principalAmount: 100000 }));
        mockFindApplicationByIdOrThrow.mockResolvedValue(application({ id: GOLD_APP_ID, productType: PRODUCT_TYPE.GOLD_LOAN }));

        await disbursementService.processPayoutWebhook(webhookInput({ utrNumber: 'UTR-GOLD-1' }), fakeReq);

        expect(mockTxLoanAccountsCreate).toHaveBeenCalledWith(
            expect.objectContaining({ data: expect.objectContaining({ status: 'ACTIVE' }) }),
        );
    });

    test('still posts the GL entry — unaffected regression', async () => {
        mockFindByPayoutId.mockResolvedValue(disbursementRecord({ loanId: GOLD_APP_ID, principalAmount: 100000 }));
        mockFindApplicationByIdOrThrow.mockResolvedValue(application({ id: GOLD_APP_ID, productType: PRODUCT_TYPE.GOLD_LOAN }));

        await disbursementService.processPayoutWebhook(webhookInput({ utrNumber: 'UTR-GOLD-1' }), fakeReq);

        expect(mockPostDisbursement).toHaveBeenCalledWith(
            expect.objectContaining({ productType: PRODUCT_TYPE.GOLD_LOAN, amount: 100000 }),
            tx,
        );
    });
});

describe('processPayoutWebhook — housing loan async completion (Path B: no account yet, stays DISBURSED)', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockAcquireLock.mockResolvedValue(true);
        mockFindAccountByApplicationId.mockResolvedValue(null);
        mockFindLatestByLoanId.mockResolvedValue({ recommendedRate: 9 });
        mockTxEnachMandatesFindFirst.mockResolvedValue(null);
        mockTxLoanAccountsCreate.mockResolvedValue({
            id: 'housing-account-1', application_id: HOUSING_APP_ID, user_id: USER_ID,
            account_number: 'AHL-0001', principal_amount: 2500000, interest_rate: 9,
            tenure_months: 240, outstanding_balance: 2500000, created_at: new Date(), updated_at: new Date(),
        });
        mockTxLoanApplicationsUpdate.mockResolvedValue({});
        mockTxDisbursementsUpdate.mockResolvedValue({});
        mockPostDisbursement.mockResolvedValue(undefined);
        mockPrismaTransaction.mockImplementation(async (callback: (tx: unknown) => Promise<void>) => callback(tx));
        mockCreateSchedule.mockResolvedValue({ monthlyEmi: 22500, totalInterest: 3900000, totalPayable: 6400000, firstEmiDate: new Date() });
        mockPrismaLoanAccountsUpdate.mockResolvedValue({});
        mockFindByIdOrThrow.mockResolvedValue({
            id: 'disb-1', loanId: HOUSING_APP_ID, loanAccountId: 'housing-account-1', status: 'COMPLETED',
            principalAmount: 2500000, processingFee: 0, netDisbursedAmount: 2500000, mode: 'IMPS',
            utrNumber: 'UTR-HOUSING-1', failureReason: null, initiatedAt: new Date(), completedAt: new Date(),
        });
    });

    test('creates a fresh account, still DISBURSED — not auto-activated (unaffected regression, most likely to break if the branch logic is wrong)', async () => {
        mockFindByPayoutId.mockResolvedValue(disbursementRecord({ loanId: HOUSING_APP_ID, principalAmount: 2500000 }));
        mockFindApplicationByIdOrThrow.mockResolvedValue(application({ id: HOUSING_APP_ID, productType: PRODUCT_TYPE.HOUSING_LOAN, tenureMonths: 240 }));

        await disbursementService.processPayoutWebhook(webhookInput({ utrNumber: 'UTR-HOUSING-1' }), fakeReq);

        expect(mockTxLoanAccountsCreate).toHaveBeenCalledWith(
            expect.objectContaining({ data: expect.objectContaining({ status: 'DISBURSED' }) }),
        );
    });

    test('still posts the GL entry — unaffected regression', async () => {
        mockFindByPayoutId.mockResolvedValue(disbursementRecord({ loanId: HOUSING_APP_ID, principalAmount: 2500000 }));
        mockFindApplicationByIdOrThrow.mockResolvedValue(application({ id: HOUSING_APP_ID, productType: PRODUCT_TYPE.HOUSING_LOAN, tenureMonths: 240 }));

        await disbursementService.processPayoutWebhook(webhookInput({ utrNumber: 'UTR-HOUSING-1' }), fakeReq);

        expect(mockPostDisbursement).toHaveBeenCalledWith(
            expect.objectContaining({ productType: PRODUCT_TYPE.HOUSING_LOAN, amount: 2500000 }),
            tx,
        );
    });
});

describe('processPayoutWebhook — concurrency / idempotency (Razorpay webhook retry)', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('a duplicate webhook delivery while the lock is already held is skipped entirely, not double-processed', async () => {
        mockAcquireLock.mockResolvedValue(false); // another delivery already holds the lock

        await disbursementService.processPayoutWebhook(webhookInput(), fakeReq);

        expect(mockFindByPayoutId).not.toHaveBeenCalled();
        expect(mockPostDisbursement).not.toHaveBeenCalled();
    });

    test('a second delivery arriving after the first already completed the disbursement short-circuits on the top-level status check — no double GL posting, no second activation attempt', async () => {
        mockAcquireLock.mockResolvedValue(true);
        // Simulates the state AFTER the first delivery already ran to
        // completion: record.status is COMPLETED.
        mockFindByPayoutId.mockResolvedValue(disbursementRecord({ status: 'COMPLETED' }));

        await disbursementService.processPayoutWebhook(webhookInput(), fakeReq);

        expect(mockPostDisbursement).not.toHaveBeenCalled();
        expect(mockTxLoanAccountsUpdate).not.toHaveBeenCalled();
        expect(mockReleaseLock).toHaveBeenCalledTimes(1); // lock is still always released
    });
});
