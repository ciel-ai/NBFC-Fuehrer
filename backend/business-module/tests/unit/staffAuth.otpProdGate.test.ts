// tests/unit/staffAuth.otpProdGate.test.ts
//
// requestOtp() logs and returns the raw OTP (devOtp) in non-prod so devs/QA
// can log in without SMS. This must be structurally impossible in
// production — this test locks that in by mocking env.isProd = true and
// asserting the OTP never appears in the response, regardless of
// NODE_ENV-adjacent input.

const mockFindFirst = jest.fn();
const redisState: Record<string, string> = {};

const mockIncr = jest.fn(async (key: string) => {
    redisState[key] = String(Number(redisState[key] ?? '0') + 1);
    return Number(redisState[key]);
});
const mockExpire = jest.fn(async () => 1);
const mockSet = jest.fn(async (key: string, value: string) => {
    redisState[key] = value;
    return 'OK';
});
const mockDel = jest.fn(async () => 1);

jest.mock('@/config/database', () => ({
    prisma: {
        admin_users: {
            findFirst: (...args: unknown[]) => mockFindFirst(...args),
        },
    },
}));

jest.mock('@/config/redis', () => ({
    getRedisClient: () => ({
        incr: mockIncr,
        expire: mockExpire,
        set: mockSet,
        del: mockDel,
    }),
    RedisKeys: {
        staffOtpSends: (phone: string) => `sends:${phone}`,
        staffOtp: (phone: string) => `otp:${phone}`,
        staffOtpAttempts: (phone: string) => `attempts:${phone}`,
    },
    RedisTTL: {
        STAFF_OTP_SEND_WINDOW: 3600,
        STAFF_OTP: 300,
    },
}));

// isProd is asserted true here — the exact condition that must suppress
// devOtp / the OTP-in-log branch in requestOtp().
jest.mock('@/config/env', () => ({
    env: { isProd: true, isTest: false, isDev: false },
}));

jest.mock('@/config/logger', () => ({
    logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

import { requestOtp } from '@/modules/staff-auth/staffAuth.service';

describe('staffAuth.requestOtp — production OTP gate', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        for (const k of Object.keys(redisState)) delete redisState[k];
        mockFindFirst.mockResolvedValue({
            id: 'staff-1',
            phone: '9999999999',
            role: 'CREDIT_CDL',
            status: 'ACTIVE',
            full_name: 'Test Staff',
            branch: null,
        });
    });

    test('never includes devOtp in the response when env.isProd is true', async () => {
        const result = await requestOtp('9999999999', 'CREDIT');

        expect(result).toEqual({ phone: '9999999999' });
        expect((result as { devOtp?: string }).devOtp).toBeUndefined();
        expect(Object.keys(result)).toEqual(['phone']);
    });

    test('never logs a plaintext OTP when env.isProd is true', async () => {
        const { logger } = jest.requireMock('@/config/logger') as { logger: { info: jest.Mock } };

        await requestOtp('9999999999', 'CREDIT');

        for (const call of logger.info.mock.calls) {
            const serialized = JSON.stringify(call);
            expect(serialized).not.toMatch(/STAFF OTP for/);
        }
    });
});
