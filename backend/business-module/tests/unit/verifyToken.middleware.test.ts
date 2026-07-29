// tests/unit/verifyToken.middleware.test.ts
//
// Regression coverage for JWT auth — the algorithm allowlist (HS256 only,
// prevents alg-confusion attacks), token-expiry/invalid-token handling, the
// Redis denylist check (logout-before-expiry revocation), and the documented
// fail-open behavior when Redis itself is unavailable.

import jwt from 'jsonwebtoken';
import type { Request, Response, NextFunction } from 'express';

const TEST_SECRET = 'test-jwt-secret-for-unit-tests';

jest.mock('@/config/env', () => ({
    env: {
        auth: { jwtSecret: 'test-jwt-secret-for-unit-tests' },
        logging: { pretty: false, level: 'info' },
        isProd: false,
        nodeEnv: 'test',
    },
}));

const mockRedisGet = jest.fn();
jest.mock('@/config/redis', () => ({
    getRedisClient: () => ({ get: (...args: unknown[]) => mockRedisGet(...args) }),
    RedisKeys: {
        tokenDenylist: (jti: string) => `denylist:${jti}`,
        staffTokenDenylist: (jti: string) => `staff-denylist:${jti}`,
    },
}));

import { verifyToken, requireAuth } from '@/middlewares/verifyToken.middleware';

function signToken(payload: Record<string, unknown>, opts: jwt.SignOptions = {}): string {
    return jwt.sign(payload, TEST_SECRET, { algorithm: 'HS256', ...opts });
}

function makeReq(authHeader?: string): Request {
    return {
        headers: authHeader ? { authorization: authHeader } : {},
        requestLogger: { child: jest.fn().mockReturnThis() },
    } as unknown as Request;
}

describe('verifyToken middleware', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockRedisGet.mockResolvedValue(null); // not denylisted, by default
    });

    test('no Authorization header — proceeds with no req.user set (optional auth)', async () => {
        const req = makeReq();
        const next = jest.fn();

        await verifyToken()(req, {} as Response, next as NextFunction);

        expect(req.user).toBeUndefined();
        expect(next).toHaveBeenCalledWith();
    });

    test('malformed header (no Bearer prefix) — treated as no token', async () => {
        const req = makeReq('just-a-raw-token-no-bearer');
        const next = jest.fn();

        await verifyToken()(req, {} as Response, next as NextFunction);

        expect(req.user).toBeUndefined();
        expect(next).toHaveBeenCalledWith();
    });

    test('valid customer token — attaches req.user with the expected shape', async () => {
        const token = signToken({ id: 'user-1', phone: '9876543210', role: 'CUSTOMER', jti: 'jti-1' });
        const req = makeReq(`Bearer ${token}`);
        const next = jest.fn();

        await verifyToken()(req, {} as Response, next as NextFunction);

        expect(req.user).toMatchObject({ id: 'user-1', role: 'CUSTOMER' });
        expect(next).toHaveBeenCalledWith();
    });

    test('valid staff token — resolves id from sub, role from staff vocabulary', async () => {
        const token = signToken({ sub: 'staff-1', role: 'CREDIT_GOLD', branchId: 'branch-1', jti: 'jti-2' });
        const req = makeReq(`Bearer ${token}`);
        const next = jest.fn();

        await verifyToken()(req, {} as Response, next as NextFunction);

        expect(req.user).toMatchObject({ id: 'staff-1', role: 'CREDIT_GOLD', staffRole: 'CREDIT_GOLD' });
        expect(next).toHaveBeenCalledWith();
    });

    test('regression: a token signed with a different algorithm (alg confusion) is rejected', async () => {
        // Sign with HS384 while the secret happens to still match — verifyJwt
        // pins algorithms: ['HS256'], so a non-HS256 token must be rejected
        // even with the correct secret.
        const token = jwt.sign({ id: 'user-1', role: 'CUSTOMER', jti: 'jti-3' }, TEST_SECRET, { algorithm: 'HS384' });
        const req = makeReq(`Bearer ${token}`);
        const next = jest.fn();

        await verifyToken()(req, {} as Response, next as NextFunction);

        expect(req.user).toBeUndefined();
        expect(next).toHaveBeenCalledTimes(1);
        expect(next.mock.calls[0]?.[0]).toBeInstanceOf(Error);
    });

    test('expired token is rejected with an auth error, not silently ignored', async () => {
        const token = signToken(
            { id: 'user-1', role: 'CUSTOMER', jti: 'jti-4' },
            { expiresIn: '-1h' },
        );
        const req = makeReq(`Bearer ${token}`);
        const next = jest.fn();

        await verifyToken()(req, {} as Response, next as NextFunction);

        expect(req.user).toBeUndefined();
        expect(next.mock.calls[0]?.[0]).toBeInstanceOf(Error);
    });

    test('a token signed with the wrong secret is rejected', async () => {
        const token = jwt.sign({ id: 'user-1', role: 'CUSTOMER', jti: 'jti-5' }, 'wrong-secret', { algorithm: 'HS256' });
        const req = makeReq(`Bearer ${token}`);
        const next = jest.fn();

        await verifyToken()(req, {} as Response, next as NextFunction);

        expect(req.user).toBeUndefined();
        expect(next.mock.calls[0]?.[0]).toBeInstanceOf(Error);
    });

    test('regression: a denylisted (logged-out) token is rejected even though the JWT itself is still valid', async () => {
        mockRedisGet.mockResolvedValue('1'); // present in denylist
        const token = signToken({ id: 'user-1', role: 'CUSTOMER', jti: 'jti-revoked' });
        const req = makeReq(`Bearer ${token}`);
        const next = jest.fn();

        await verifyToken()(req, {} as Response, next as NextFunction);

        expect(req.user).toBeUndefined();
        expect(next.mock.calls[0]?.[0]).toBeInstanceOf(Error);
    });

    test('fails open (allows the request) when Redis itself is unavailable, rather than locking out every user', async () => {
        mockRedisGet.mockRejectedValue(new Error('ECONNREFUSED'));
        const token = signToken({ id: 'user-1', role: 'CUSTOMER', jti: 'jti-6' });
        const req = makeReq(`Bearer ${token}`);
        const next = jest.fn();

        await verifyToken()(req, {} as Response, next as NextFunction);

        expect(req.user).toMatchObject({ id: 'user-1' });
        expect(next).toHaveBeenCalledWith();
    });
});

describe('requireAuth middleware', () => {
    test('blocks a request with no req.user', () => {
        const req = {} as Request;
        const next = jest.fn();

        requireAuth()(req, {} as Response, next as NextFunction);

        expect(next.mock.calls[0]?.[0]).toBeInstanceOf(Error);
    });

    test('allows a request with req.user set (verifyToken already ran)', () => {
        const req = { user: { id: 'user-1', role: 'CUSTOMER' } } as unknown as Request;
        const next = jest.fn();

        requireAuth()(req, {} as Response, next as NextFunction);

        expect(next).toHaveBeenCalledWith();
    });
});