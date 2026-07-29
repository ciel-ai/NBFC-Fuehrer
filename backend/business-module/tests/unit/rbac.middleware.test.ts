// tests/unit/rbac.middleware.test.ts
//
// Regression coverage for role-based access control — the mechanism behind
// nearly every IDOR fix made today (applications, search, grievances, gold/
// housing loan ownership, payments/mandates). A broken hierarchy or bypass
// here silently reopens all of those fixes at once.

import type { Request, Response, NextFunction } from 'express';
import { ROLE } from '@/config/constants';
import {
    hasRole,
    allowRoles,
    requireOwnership,
    requireAgentContext,
} from '@/middlewares/rbac.middleware';

function mockNext(): jest.Mock {
    return jest.fn();
}

describe('hasRole', () => {
    test('SUPER_ADMIN passes any role check', () => {
        expect(hasRole(ROLE.SUPER_ADMIN, ROLE.CREDIT_MANAGER)).toBe(true);
        expect(hasRole(ROLE.SUPER_ADMIN, ROLE.CUSTOMER)).toBe(true);
    });

    test('a higher-ranked role satisfies a lower requirement', () => {
        expect(hasRole(ROLE.CREDIT_MANAGER, ROLE.OPS_EXECUTIVE)).toBe(true);
    });

    test('a lower-ranked role does NOT satisfy a higher requirement', () => {
        expect(hasRole(ROLE.OPS_EXECUTIVE, ROLE.CREDIT_MANAGER)).toBe(false);
    });

    test('CUSTOMER cannot satisfy any staff-role requirement', () => {
        expect(hasRole(ROLE.CUSTOMER, ROLE.OPS_EXECUTIVE)).toBe(false);
        expect(hasRole(ROLE.CUSTOMER, ROLE.CREDIT_MANAGER)).toBe(false);
        expect(hasRole(ROLE.CUSTOMER, ROLE.FINANCE)).toBe(false);
    });

    test('AGENT cannot satisfy CREDIT_MANAGER requirement (regression: agent must never be treated as staff)', () => {
        expect(hasRole(ROLE.AGENT, ROLE.CREDIT_MANAGER)).toBe(false);
    });
});

describe('allowRoles middleware', () => {
    test('blocks a request with no authenticated user', () => {
        const req = {} as Request;
        const next = mockNext();

        allowRoles(ROLE.CREDIT_MANAGER)(req, {} as Response, next as NextFunction);

        expect(next).toHaveBeenCalledTimes(1);
        expect(next.mock.calls[0]?.[0]).toBeInstanceOf(Error);
    });

    test('allows a user whose role is in the allowed list', () => {
        const req = { user: { role: ROLE.CREDIT_MANAGER } } as Request;
        const next = mockNext();

        allowRoles(ROLE.CREDIT_MANAGER, ROLE.FINANCE)(req, {} as Response, next as NextFunction);

        expect(next).toHaveBeenCalledWith();
    });

    test('blocks a user whose role is NOT in the allowed list', () => {
        const req = { user: { role: ROLE.CUSTOMER } } as Request;
        const next = mockNext();

        allowRoles(ROLE.CREDIT_MANAGER)(req, {} as Response, next as NextFunction);

        expect(next).toHaveBeenCalledTimes(1);
        expect(next.mock.calls[0]?.[0]).toBeInstanceOf(Error);
    });

    test('SUPER_ADMIN bypasses the allowed-roles list entirely', () => {
        const req = { user: { role: ROLE.SUPER_ADMIN } } as Request;
        const next = mockNext();

        allowRoles(ROLE.CREDIT_MANAGER)(req, {} as Response, next as NextFunction);

        expect(next).toHaveBeenCalledWith();
    });

    test('regression: CUSTOMER must never pass a staff-only route (applications/search/grievances IDOR fix)', () => {
        const req = { user: { role: ROLE.CUSTOMER } } as Request;
        const next = mockNext();

        allowRoles(ROLE.OPS_EXECUTIVE, ROLE.CREDIT_MANAGER, ROLE.ADMIN, ROLE.SUPER_ADMIN)(
            req, {} as Response, next as NextFunction,
        );

        expect(next.mock.calls[0]?.[0]).toBeInstanceOf(Error);
    });
});

describe('requireOwnership middleware', () => {
    test('blocks unauthenticated requests', () => {
        const req = { params: {} } as unknown as Request;
        const next = mockNext();

        requireOwnership('userId')(req, {} as Response, next as NextFunction);

        expect(next.mock.calls[0]?.[0]).toBeInstanceOf(Error);
    });

    test('a customer accessing their own resource passes', () => {
        const req = {
            user: { id: 'user-1', role: ROLE.CUSTOMER },
            params: { userId: 'user-1' },
        } as unknown as Request;
        const next = mockNext();

        requireOwnership('userId')(req, {} as Response, next as NextFunction);

        expect(next).toHaveBeenCalledWith();
    });

    test('regression: a customer accessing ANOTHER customer\'s resource is blocked (core IDOR case)', () => {
        const req = {
            user: { id: 'user-1', role: ROLE.CUSTOMER },
            params: { userId: 'user-2' },
        } as unknown as Request;
        const next = mockNext();

        requireOwnership('userId')(req, {} as Response, next as NextFunction);

        expect(next.mock.calls[0]?.[0]).toBeInstanceOf(Error);
    });

    test('staff roles bypass ownership and can access any customer\'s resource', () => {
        const req = {
            user: { id: 'staff-1', role: ROLE.CREDIT_MANAGER },
            params: { userId: 'some-other-customer' },
        } as unknown as Request;
        const next = mockNext();

        requireOwnership('userId')(req, {} as Response, next as NextFunction);

        expect(next).toHaveBeenCalledWith();
    });

    test('AGENT role is NOT in the staff bypass list — must still pass ownership check', () => {
        const req = {
            user: { id: 'agent-1', role: ROLE.AGENT },
            params: { userId: 'some-customer' },
        } as unknown as Request;
        const next = mockNext();

        requireOwnership('userId')(req, {} as Response, next as NextFunction);

        expect(next.mock.calls[0]?.[0]).toBeInstanceOf(Error);
    });
});

describe('requireAgentContext middleware', () => {
    test('blocks an AGENT-role user with no agentId on the token', () => {
        const req = { user: { role: ROLE.AGENT } } as Request;
        const next = mockNext();

        requireAgentContext()(req, {} as Response, next as NextFunction);

        expect(next.mock.calls[0]?.[0]).toBeInstanceOf(Error);
    });

    test('allows an AGENT-role user with a valid agentId', () => {
        const req = { user: { role: ROLE.AGENT, agentId: 'agent-123' } } as Request;
        const next = mockNext();

        requireAgentContext()(req, {} as Response, next as NextFunction);

        expect(next).toHaveBeenCalledWith();
    });

    test('non-agent roles pass through without needing agentId', () => {
        const req = { user: { role: ROLE.CUSTOMER } } as Request;
        const next = mockNext();

        requireAgentContext()(req, {} as Response, next as NextFunction);

        expect(next).toHaveBeenCalledWith();
    });
});