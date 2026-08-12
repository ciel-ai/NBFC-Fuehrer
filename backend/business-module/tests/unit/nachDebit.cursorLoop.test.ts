// tests/unit/nachDebit.cursorLoop.test.ts
//
// Proves the cursor-based loop processes all EMIs regardless of total count.
// Simulates 600 EMIs in 6 batches of 100, then an empty batch to signal end.
// The old take:500 implementation would have silently missed 100 EMIs.

const mockFindMany = jest.fn();

jest.mock('@/config/database', () => ({
    prisma: {
        emi_schedule: {
            findMany: (...args: unknown[]) => mockFindMany(...args),
        },
    },
}));

const mockAcquireLock = jest.fn();
const mockReleaseLock = jest.fn();

jest.mock('@/config/redis', () => ({
    acquireLock: (...args: unknown[]) => mockAcquireLock(...args),
    releaseLock: (...args: unknown[]) => mockReleaseLock(...args),
    RedisTTL: { CRON_JOB_LOCK: 3600 },
}));

const mockProcessNachDebit = jest.fn();

jest.mock('@/modules/payments', () => ({
    paymentsService: {
        processNachDebit: (...args: unknown[]) => mockProcessNachDebit(...args),
    },
}));

jest.mock('@/config/logger', () => ({
    createModuleLogger: () => ({
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
    }),
}));

import { runNachDebitJob } from '@/jobs/nachDebit.job';

function makeEmi(id: string) {
    return {
        id,
        emi_number: 1,
        emi_amount: 5000,
        penalty_amount: 0,
        loan_account: {
            id: `account-${id}`,
            user_id: 'user-1',
            razorpay_mandate_id: 'mandate-1',
            status: 'ACTIVE',
            enach_mandates: [{ id: 'em-1', razorpay_mandate_id: 'mandate-1' }],
        },
    };
}

describe('runNachDebitJob — cursor loop', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockAcquireLock.mockResolvedValue(true);
        mockReleaseLock.mockResolvedValue(undefined);
        mockProcessNachDebit.mockResolvedValue({});
        jest.spyOn(global, 'setTimeout').mockImplementation((fn: (...args: unknown[]) => void) => {
            if (typeof fn === 'function') fn();
            return 0 as unknown as ReturnType<typeof setTimeout>;
        });
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    test('processes all 600 EMIs across 6 batches — proves take:500 is gone', async () => {
        let callCount = 0;
        mockFindMany.mockImplementation(() => {
            callCount++;
            if (callCount <= 6) {
                return Promise.resolve(
                    Array.from({ length: 100 }, (_, i) =>
                        makeEmi(`batch${callCount}-item${i}`),
                    ),
                );
            }
            return Promise.resolve([]);
        });

        await runNachDebitJob();

        expect(mockProcessNachDebit).toHaveBeenCalledTimes(600);
        expect(mockFindMany).toHaveBeenCalledTimes(7);
    });

    test('stops immediately when no EMIs are due', async () => {
        mockFindMany.mockResolvedValue([]);

        await runNachDebitJob();

        expect(mockProcessNachDebit).not.toHaveBeenCalled();
        expect(mockFindMany).toHaveBeenCalledTimes(1);
    });

    test('skips the job when another instance holds the lock', async () => {
        mockAcquireLock.mockResolvedValue(false);

        await runNachDebitJob();

        expect(mockFindMany).not.toHaveBeenCalled();
        expect(mockProcessNachDebit).not.toHaveBeenCalled();
    });
});