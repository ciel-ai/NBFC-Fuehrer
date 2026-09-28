// tests/unit/auditTrail.middleware.test.ts
//
// Regression coverage for closing the audit-trail exclusion gap: /sales/ and
// /consumer-durable-loans/ used to be hard-excluded from audit logging as
// "mock" routes. Both are now wired to real DB-writing logic
// (cdlLoans.service.ts / sales.service.ts), so they must produce audit_logs
// rows like any other mutating route. This test locks that in so the
// exclusion can't silently come back.

import { EventEmitter } from 'events';
import type { Request, Response, NextFunction } from 'express';
import type { AuthRequest } from '@/types/express';

const mockCreate = jest.fn();

jest.mock('@/config/database', () => ({
    prisma: {
        audit_logs: {
            create: (...args: unknown[]) => mockCreate(...args),
        },
    },
}));

import { auditTrail } from '@/middlewares/auditTrail.middleware';

function makeReq(method: string, path: string): AuthRequest {
    return {
        method,
        path,
        headers: {},
        requestId: 'req-1',
        ip: '127.0.0.1',
        user: { id: 'user-1', role: 'AGENT' },
    } as unknown as AuthRequest;
}

function makeRes(statusCode: number): Response {
    const res = new EventEmitter() as unknown as Response & EventEmitter;
    (res as unknown as { statusCode: number }).statusCode = statusCode;
    return res as Response;
}

async function flush() {
    // audit writes are fire-and-forget (no await in the middleware) —
    // let the microtask queue drain so mockCreate has been invoked.
    await new Promise((resolve) => setImmediate(resolve));
}

describe('auditTrail middleware', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('a successful CDL disbursement-triggering POST produces an audit_logs row (CDL is no longer excluded)', async () => {
        const req = makeReq('POST', '/consumer-durable-loans/applications');
        const res = makeRes(201);
        const next = jest.fn();

        auditTrail()(req, res, next as NextFunction);
        expect(next).toHaveBeenCalledTimes(1);

        res.emit('finish');
        await flush();

        expect(mockCreate).toHaveBeenCalledTimes(1);
        expect(mockCreate.mock.calls[0]?.[0]?.data).toEqual(
            expect.objectContaining({ http_path: '/consumer-durable-loans/applications' }),
        );
    });

    test('a successful sales POST produces an audit_logs row (sales is no longer excluded)', async () => {
        const req = makeReq('POST', '/sales/applications');
        const res = makeRes(201);
        const next = jest.fn();

        auditTrail()(req, res, next as NextFunction);
        res.emit('finish');
        await flush();

        expect(mockCreate).toHaveBeenCalledTimes(1);
        expect(mockCreate.mock.calls[0]?.[0]?.data).toEqual(
            expect.objectContaining({ http_path: '/sales/applications' }),
        );
    });

    test('a non-mutating GET is still not audited (unrelated to the mock-route exclusion)', async () => {
        const req = makeReq('GET', '/consumer-durable-loans/applications/123');
        const res = makeRes(200);
        const next = jest.fn();

        auditTrail()(req, res, next as NextFunction);
        res.emit('finish');
        await flush();

        expect(mockCreate).not.toHaveBeenCalled();
    });
});
