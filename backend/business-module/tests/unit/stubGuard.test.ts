// tests/unit/stubGuard.test.ts
//
// Regression test for the CDL disburse-route fix: the audit found that
// disburseToMerchant fabricated a "COMPLETED" response with a fake UTR and,
// unlike gold-loan/housing-loan stubs, had no stubGuard() protecting it from
// being reachable in production. This test locks in stubGuard()'s core
// behavior so that protection can't silently regress again.

import type { Request, Response, NextFunction } from 'express';

jest.mock('@/config/env', () => ({
    env: {
        features: {
            enableUnwiredLoanStubs: false,
        },
    },
}));

import { stubGuard } from '@/middlewares/stubGuard.middleware';
import { env } from '@/config/env';

describe('stubGuard middleware', () => {
    let req: Request;
    let res: Response;
    let next: jest.Mock;
    let statusMock: jest.Mock;
    let jsonMock: jest.Mock;

    beforeEach(() => {
        jsonMock = jest.fn();
        statusMock = jest.fn(() => ({ json: jsonMock }));
        req = {} as Request;
        res = { status: statusMock } as unknown as Response;
        next = jest.fn();
    });

    test('blocks the request when enableUnwiredLoanStubs is false (default/production-safe state)', () => {
        (env.features as { enableUnwiredLoanStubs: boolean }).enableUnwiredLoanStubs = false;

        stubGuard()(req, res, next as NextFunction);

        expect(next).not.toHaveBeenCalled();
        expect(statusMock).toHaveBeenCalledWith(500);
        expect(jsonMock).toHaveBeenCalledWith(
            expect.objectContaining({
                success: false,
                errorCode: 'FEATURE_NOT_WIRED',
            }),
        );
    });

    test('allows the request through when enableUnwiredLoanStubs is explicitly true', () => {
        (env.features as { enableUnwiredLoanStubs: boolean }).enableUnwiredLoanStubs = true;

        stubGuard()(req, res, next as NextFunction);

        expect(next).toHaveBeenCalledTimes(1);
        expect(statusMock).not.toHaveBeenCalled();
    });

    test('never fabricates a success response itself — only next() or a FEATURE_NOT_WIRED error', () => {
        (env.features as { enableUnwiredLoanStubs: boolean }).enableUnwiredLoanStubs = false;

        stubGuard()(req, res, next as NextFunction);

        // The whole point of this middleware is that it must never let a
        // stubbed route silently report success — assert the error path
        // never returns a 2xx-shaped body.
        const callArgs = jsonMock.mock.calls[0]?.[0];
        expect(callArgs?.success).toBe(false);
    });
});