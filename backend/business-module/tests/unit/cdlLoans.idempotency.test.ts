// tests/unit/cdlLoans.idempotency.test.ts
//
// Regression test for CDL audit finding #10: no CDL route carried the
// platform's idempotency() middleware, unlike every other money-moving
// module (disbursement.routes.ts, payments.routes.ts). idempotency()
// itself already has full behavioral coverage in
// idempotency.middleware.test.ts (first-request-processes, concurrent-
// retry-409, completed-retry-replays) — this file only checks that CDL's
// routes actually wire the real middleware in, at the route-configuration
// level, not its internals again.
//
// idempotency() is mocked with a single, stable function reference so its
// presence in a route's registered middleware stack can be detected by
// identity — every real call site in cdlLoans.routes.ts calls idempotency()
// once at module-load time, and this mock makes every one of those calls
// return the exact same function.

const mockIdempotencyMiddleware = (_req: unknown, _res: unknown, next: () => void) => next();
const mockIdempotencyFactory = jest.fn(() => mockIdempotencyMiddleware);

jest.mock('@/middlewares/idempotency.middleware', () => ({
    idempotency: () => mockIdempotencyFactory(),
}));

// cdlLoansController itself isn't under test here — replaced with no-ops
// so importing the real router doesn't pull in the full service
// dependency graph (prisma, kyc, emi, payments, providers, ...) just to
// inspect route structure.
jest.mock('@/modules/cdlLoans/cdlLoans.controller', () => ({
    cdlLoansController: new Proxy({}, { get: () => jest.fn() }),
}));

import { cdlLoansRouter } from '@/modules/cdlLoans/cdlLoans.routes';

interface RouteLayer {
    route?: {
        path: string;
        methods: Record<string, boolean>;
        stack: Array<{ handle: unknown }>;
    };
}

function middlewareStackFor(path: string, method: 'get' | 'post'): unknown[] {
    const layer = (cdlLoansRouter.stack as RouteLayer[]).find(
        (l) => l.route?.path === path && l.route.methods[method],
    );
    if (!layer?.route) {
        throw new Error(`No registered ${method.toUpperCase()} route found for path: ${path}`);
    }
    return layer.route.stack.map((s) => s.handle);
}

function hasIdempotency(path: string, method: 'get' | 'post'): boolean {
    return middlewareStackFor(path, method).includes(mockIdempotencyMiddleware);
}

describe('CDL routes carry idempotency() on state-changing endpoints (audit finding #10)', () => {
    test('registerNachMandate (a representative real-money-moving route) has idempotency() wired', () => {
        expect(hasIdempotency('/applications/:id/nach', 'post')).toBe(true);
    });

    test('disburseToMerchant (the highest-stakes route in this module) has idempotency() wired', () => {
        expect(hasIdempotency('/applications/:id/disburse', 'post')).toBe(true);
    });

    test.each([
        '/applications',
        '/applications/:id/kyc',
        '/applications/:id/compliance',
        '/applications/:id/credit-assessment',
        '/applications/:id/credit-decision',
        '/applications/:id/esign',
        '/loans/:id/payments',
        '/loans/:id/part-payment',
        '/loans/:id/payment-failure',
        '/loans/:id/close',
        '/loans/:id/noc',
    ])('%s (POST) has idempotency() wired', (path) => {
        expect(hasIdempotency(path, 'post')).toBe(true);
    });
});

describe('CDL read routes do NOT carry idempotency() — regression guard against accidental addition', () => {
    test('getEmiSchedule (GET) does not have idempotency() wired', () => {
        expect(hasIdempotency('/loans/:id/emi-schedule', 'get')).toBe(false);
    });

    test('getOverdueStatus (GET) does not have idempotency() wired', () => {
        expect(hasIdempotency('/loans/:id/overdue', 'get')).toBe(false);
    });
});

describe('generateAgreement — deliberate decision: idempotency() IS added, on top of its own existing re-entrancy guard', () => {
    // generateAgreement already has a purpose-built, DB-state-based guard
    // (checks esign_status — see cdlLoansService.generateAgreement and
    // cdlLoans.agreementIdempotency.test.ts) that closes the SEQUENTIAL
    // re-call case. That guard is a check-then-act against the current
    // row, which cannot by itself close a genuine CONCURRENT race: two
    // simultaneous requests can both read esign_status as not-yet-set
    // before either has written anything, both pass the guard, and both
    // fire a real PDF generation + real eSign-provider call.
    // idempotency() reserves the key atomically before either request
    // does any real work, closing that specific gap — the two mechanisms
    // protect different windows, this is not redundant, hence the
    // decision to add it here rather than treat it as covered already.
    test('generateAgreement (POST) has idempotency() wired, in addition to its own esign_status guard', () => {
        expect(hasIdempotency('/applications/:id/agreement', 'post')).toBe(true);
    });
});
