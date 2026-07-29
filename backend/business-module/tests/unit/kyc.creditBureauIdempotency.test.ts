// tests/unit/kyc.creditBureauIdempotency.test.ts
//
// Regression test for the credit-bureau idempotency fix: before this fix,
// runCreditBureauCheck had no guard against re-running an already-completed
// check — every call re-triggered a real, paid vendor pull (and a repeated
// hard credit pull can itself ding the customer's score). This test locks
// in that a second call short-circuits instead of re-billing/re-pulling.

import { KYC_CHECK, BUSINESS_RULES } from '@/config/constants';

const mockFindByUserIdOrThrow = jest.fn();
const mockSaveScores = jest.fn();
const mockAppendSignzyResponse = jest.fn();
const mockRecordCheckResult = jest.fn();

jest.mock('@/modules/kyc/kyc.repository', () => ({
    kycRepository: {
        findByUserIdOrThrow: (...args: unknown[]) => mockFindByUserIdOrThrow(...args),
        saveScores: (...args: unknown[]) => mockSaveScores(...args),
        appendSignzyResponse: (...args: unknown[]) => mockAppendSignzyResponse(...args),
        recordCheckResult: (...args: unknown[]) => mockRecordCheckResult(...args),
    },
}), { virtual: false });

const mockFetchCreditReport = jest.fn();
const mockDecrypt = jest.fn();

jest.mock('@/providers', () => ({
    getCreditBureauProvider: () => ({ fetchCreditReport: mockFetchCreditReport }),
    getEncryptionProvider: () => ({ decrypt: mockDecrypt, encrypt: jest.fn() }),
    getKycVerifyProvider: jest.fn(),
    getBankStatementProvider: jest.fn(),
    getFraudScoreProvider: jest.fn(),
    getAmlCheckProvider: jest.fn(),
    getESignProvider: jest.fn(),
    getDocStorageProvider: jest.fn(),
}));

jest.mock('@/modules/kyc/kyc.events', () => ({
    kycEvents: {
        checkCompleted: jest.fn(),
        checkFailed: jest.fn(),
    },
}));

jest.mock('@/middlewares', () => ({
    setAuditContext: jest.fn(),
}));

import { kycService } from '@/modules/kyc/kyc.service';

describe('runCreditBureauCheck — idempotency guard', () => {
    const userId = 'test-user-001';
    const fakeReq = {} as never;

    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('short-circuits and never calls the vendor when the check already passed', async () => {
        mockFindByUserIdOrThrow.mockResolvedValue({
            panEncrypted: 'ciphertext',
            completedChecks: [KYC_CHECK.RISK_SCORE],
        });

        const result = await kycService.runCreditBureauCheck(
            userId, 'Test User', '1990-01-01', '9876543210', fakeReq,
        );

        expect(result).toEqual({
            checkType: KYC_CHECK.RISK_SCORE,
            passed: true,
            data: { alreadyVerified: true },
        });
        expect(mockFetchCreditReport).not.toHaveBeenCalled();
        expect(mockSaveScores).not.toHaveBeenCalled();
    });

    test('calls the vendor and records the result when the check has not run before', async () => {
        mockFindByUserIdOrThrow.mockResolvedValue({
            panEncrypted: 'ciphertext',
            completedChecks: [],
        });
        mockDecrypt.mockResolvedValue('ABCDE1234F');
        mockFetchCreditReport.mockResolvedValue({
            score: 750,
            rawResponse: { raw: true },
        });

        const result = await kycService.runCreditBureauCheck(
            userId, 'Test User', '1990-01-01', '9876543210', fakeReq,
        );

        expect(mockFetchCreditReport).toHaveBeenCalledTimes(1);
        expect(mockSaveScores).toHaveBeenCalledWith(userId, { creditScore: 750 });
        expect(mockRecordCheckResult).toHaveBeenCalledWith(
            userId, KYC_CHECK.RISK_SCORE, true,
        );
        expect(result.passed).toBe(750 >= BUSINESS_RULES.MIN_CREDIT_SCORE);
    });
});