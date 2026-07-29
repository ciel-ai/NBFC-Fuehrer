// tests/unit/idempotency.middleware.test.ts
//
// Regression coverage for the idempotency-key scoping fix: before this fix,
// the raw header value alone was the lookup key, so two different callers
// reusing the same key string could receive each other's cached financial
// response. The fix scopes the key by userId (and DB-level by request path).
// This test locks in that scoping and the core replay/conflict semantics.

import type { Response, NextFunction } from 'express';
import type { AuthRequest } from '@/types/express';

const mockCreate = jest.fn();
const mockFindUnique = jest.fn();
const mockUpdate = jest.fn();

jest.mock('@/config/database', () => ({
    prisma: {
        idempotency_keys: {
            create: (...args: unknown[]) => mockCreate(...args),
            findUnique: (...args: unknown[]) => mockFindUnique(...args),
            update: (...args: unknown[]) => mockUpdate(...args),
        },
    },
}));

import { idempotency } from '@/middlewares/idempotency.middleware';
import { Prisma } from '@/generated/prisma-client';

function makeReq(headers: Record<string, string>, userId?: string): AuthRequest {
    return {
        headers,
        path: '/payments/process',
        user: userId ? { id: userId } : undefined,
    } as unknown as AuthRequest;
}

function makeRes(): Response {
    const res = {} as Response;
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res;
}

describe('idempotency middleware', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('passes through immediately with no Idempotency-Key header', async () => {
        const req = makeReq({});
        const res = makeRes();
        const next = jest.fn();

        await idempotency()(req, res, next as NextFunction);

        expect(next).toHaveBeenCalledTimes(1);
        expect(mockCreate).not.toHaveBeenCalled();
    });

    test('rejects a key longer than 200 characters with 400', async () => {
        const req = makeReq({ 'idempotency-key': 'x'.repeat(201) });
        const res = makeRes();
        const next = jest.fn();

        await idempotency()(req, res, next as NextFunction);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(next).not.toHaveBeenCalled();
    });

    test('regression: scopes the DB key by userId — two different users reusing the same raw key get different scoped keys', async () => {
        mockCreate.mockResolvedValue({});

        const next = jest.fn();

        const reqUserA = makeReq({ 'idempotency-key': 'shared-key-value' }, 'user-A');
        await idempotency()(reqUserA, makeRes(), next as NextFunction);

        const reqUserB = makeReq({ 'idempotency-key': 'shared-key-value' }, 'user-B');
        await idempotency()(reqUserB, makeRes(), next as NextFunction);

        expect(mockCreate).toHaveBeenCalledTimes(2);
        const keyUsedForA = mockCreate.mock.calls[0]?.[0]?.data?.key;
        const keyUsedForB = mockCreate.mock.calls[1]?.[0]?.data?.key;

        expect(keyUsedForA).toBe('user-A:shared-key-value');
        expect(keyUsedForB).toBe('user-B:shared-key-value');
        expect(keyUsedForA).not.toBe(keyUsedForB);
    });

    test('an unauthenticated caller (no req.user) is scoped under "anon", not left unscoped', async () => {
        mockCreate.mockResolvedValue({});
        const req = makeReq({ 'idempotency-key': 'some-key' });
        const next = jest.fn();

        await idempotency()(req, makeRes(), next as NextFunction);

        const keyUsed = mockCreate.mock.calls[0]?.[0]?.data?.key;
        expect(keyUsed).toBe('anon:some-key');
    });

    test('replays the stored response for a completed key instead of re-processing', async () => {
        const p2002Error = Object.assign(
            new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
                code: 'P2002', clientVersion: '5.22.0',
            }),
            { code: 'P2002' },
        );
        mockCreate.mockRejectedValue(p2002Error);
        mockFindUnique.mockResolvedValue({
            status_code: 200,
            response: { success: true, replayed: true },
        });

        const req = makeReq({ 'idempotency-key': 'completed-key' }, 'user-A');
        const res = makeRes();
        const next = jest.fn();

        await idempotency()(req, res, next as NextFunction);

        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith({ success: true, replayed: true });
        expect(next).not.toHaveBeenCalled();
    });

    test('rejects a concurrent in-flight duplicate with 409 instead of guessing the result', async () => {
        const p2002Error = Object.assign(
            new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
                code: 'P2002', clientVersion: '5.22.0',
            }),
            { code: 'P2002' },
        );
        mockCreate.mockRejectedValue(p2002Error);
        mockFindUnique.mockResolvedValue({
            status_code: null,
            response: null,
        });

        const req = makeReq({ 'idempotency-key': 'in-flight-key' }, 'user-A');
        const res = makeRes();
        const next = jest.fn();

        await idempotency()(req, res, next as NextFunction);

        expect(res.status).toHaveBeenCalledWith(409);
        expect(next).not.toHaveBeenCalled();
    });

    test('a fresh key is reserved and the request proceeds to next()', async () => {
        mockCreate.mockResolvedValue({});

        const req = makeReq({ 'idempotency-key': 'fresh-key' }, 'user-A');
        const res = makeRes();
        const next = jest.fn();

        await idempotency()(req, res, next as NextFunction);

        expect(mockCreate).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({
                    key: 'user-A:fresh-key',
                    request_path: '/payments/process',
                }),
            }),
        );
        expect(next).toHaveBeenCalledTimes(1);
    });
});