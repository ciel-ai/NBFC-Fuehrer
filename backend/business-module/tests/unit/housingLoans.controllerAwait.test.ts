// tests/unit/housingLoans.controllerAwait.test.ts
//
// Regression test for the missing-await bug in housingLoans.controller.ts:
// 10 handlers (generateAgreement, eSign, registerNach, applyPmaySubsidy,
// disburseToBuilder, getEmiSchedule, getPrepaymentQuote, processPrepayment,
// getOverdueStatus, closeLoan) called their async housingLoansService
// method WITHOUT await. Since successResponse() just wraps whatever it's
// given, an un-awaited async call means res.json() serializes an
// unresolved Promise (JSON.stringify(promise) === '{}') — the real
// service data never reaches the client, and the actual work runs
// fire-and-forget, detached from the request.
//
// These tests mock housingLoansService methods to resolve on a later tick
// (not synchronously) — exactly what a real async DB/PDF/payment call
// looks like. Before the fix, res.json would have been called with the
// data field as {} (the Promise, un-awaited, JSON-serializes empty).
// After the fix, it's called with the real resolved value.

const mockGenerateAgreement = jest.fn();
const mockDisburseToBuilder = jest.fn();
const mockCloseLoan = jest.fn();

jest.mock('@/modules/housingLoans/housingLoans.service', () => ({
    housingLoansService: {
        generateAgreement: (...args: unknown[]) => mockGenerateAgreement(...args),
        disburseToBuilder: (...args: unknown[]) => mockDisburseToBuilder(...args),
        closeLoan: (...args: unknown[]) => mockCloseLoan(...args),
    },
}));

const mockFindApplicationByIdOrThrow = jest.fn();
const mockFindAccountByIdOrThrow = jest.fn();
jest.mock('@/modules/loans/loans.repository', () => ({
    loansRepository: {
        findApplicationByIdOrThrow: (...args: unknown[]) => mockFindApplicationByIdOrThrow(...args),
        findAccountByIdOrThrow: (...args: unknown[]) => mockFindAccountByIdOrThrow(...args),
    },
}));

jest.mock('@/utils/ownership.util', () => ({
    assertApplicationOwnership: jest.fn(),
    assertAccountOwnership: jest.fn(),
}));

import { housingLoansController } from '@/modules/housingLoans/housingLoans.controller';
import type { AuthRequest } from '@/types/express';
import type { Response, NextFunction } from 'express';

function makeReqResNext(overrides: Partial<AuthRequest> = {}) {
    const req = {
        params: { id: 'loan-1' },
        body: {},
        user: { id: 'user-1', role: 'CUSTOMER' },
        ...overrides,
    } as unknown as AuthRequest;

    const jsonMock = jest.fn();
    const statusMock = jest.fn(() => ({ json: jsonMock }));
    const res = { status: statusMock } as unknown as Response;
    const next = jest.fn() as NextFunction;

    return { req, res, jsonMock, statusMock, next };
}

// Resolves on a later tick — mirrors a real async DB/PDF/payment call.
// If the controller doesn't await, res.json() runs before this resolves.
function resolveLater<T>(value: T): Promise<T> {
    return new Promise((resolve) => setImmediate(() => resolve(value)));
}

describe('housingLoans.controller.ts — async service calls are awaited', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockFindApplicationByIdOrThrow.mockResolvedValue({ userId: 'user-1' });
        mockFindAccountByIdOrThrow.mockResolvedValue({ userId: 'user-1' });
    });

    test('generateAgreement: response contains the real resolved agreement, not an empty/unresolved value', async () => {
        mockGenerateAgreement.mockReturnValue(resolveLater({ agreementId: 'agr-1', status: 'GENERATED' }));
        const { req, res, jsonMock, next } = makeReqResNext();

        await housingLoansController.generateAgreement(req, res, next);

        expect(next).not.toHaveBeenCalled();
        expect(jsonMock).toHaveBeenCalledWith(
            expect.objectContaining({ data: { agreementId: 'agr-1', status: 'GENERATED' } }),
        );
    });

    test('disburseToBuilder: response contains the real resolved disbursal result — the most severe case, since this moves real money', async () => {
        mockDisburseToBuilder.mockReturnValue(resolveLater({ disbursalId: 'disb-1', status: 'COMPLETED' }));
        const { req, res, jsonMock, next } = makeReqResNext();

        await housingLoansController.disburseToBuilder(req, res, next);

        expect(next).not.toHaveBeenCalled();
        expect(jsonMock).toHaveBeenCalledWith(
            expect.objectContaining({ data: { disbursalId: 'disb-1', status: 'COMPLETED' } }),
        );
    });

    test('closeLoan: response contains the real resolved closure result (found and fixed alongside the originally-flagged 9)', async () => {
        mockCloseLoan.mockReturnValue(resolveLater({ closureId: 'closure-1', totalAmountPaid: 0 }));
        const { req, res, jsonMock, next } = makeReqResNext();

        await housingLoansController.closeLoan(req, res, next);

        expect(next).not.toHaveBeenCalled();
        expect(jsonMock).toHaveBeenCalledWith(
            expect.objectContaining({ data: { closureId: 'closure-1', totalAmountPaid: 0 } }),
        );
    });

    test('an error thrown inside the (properly awaited) async service call is caught and passed to next(), not left as an unhandled rejection', async () => {
        mockDisburseToBuilder.mockImplementation(() =>
            new Promise((_resolve, reject) => setImmediate(() => reject(new Error('payout failed')))),
        );
        const { req, res, next } = makeReqResNext();

        await housingLoansController.disburseToBuilder(req, res, next);

        expect(next).toHaveBeenCalledWith(expect.objectContaining({ message: 'payout failed' }));
    });
});
