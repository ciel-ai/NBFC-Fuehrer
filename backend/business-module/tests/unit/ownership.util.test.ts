// tests/unit/ownership.util.test.ts
//
// ownership.util.ts is used by goldLoans, housingLoans, payments, and
// grievances controllers (and, as of this batch, cdlLoans too), but had
// no dedicated test file of its own — despite being the single shared
// utility every ownership/IDOR fix in this codebase is meant to route
// through. This covers the utility directly, independent of any one
// module's usage of it.

import { assertOwnsResource, assertApplicationOwnership, assertAccountOwnership } from '@/utils/ownership.util';
import { ForbiddenError } from '@/errors';
import { ROLE } from '@/config/constants';

const OWNER_ID = 'user-1';
const OTHER_ID = 'user-2';

describe('assertOwnsResource', () => {
    test('does not throw when callerId matches resourceOwnerId', () => {
        expect(() => assertOwnsResource(OWNER_ID, OWNER_ID, ROLE.CUSTOMER)).not.toThrow();
    });

    test('throws ForbiddenError when callerId does not match resourceOwnerId', () => {
        expect(() => assertOwnsResource(OTHER_ID, OWNER_ID, ROLE.CUSTOMER)).toThrow(ForbiddenError);
    });

    test('a staff role bypasses the check even when ids do not match', () => {
        // ROLE.SUPER_ADMIN, ROLE.FINANCE, ROLE.CREDIT_MANAGER, etc. are all
        // staff per isStaffRole() — spot-check a few, not just one.
        expect(() => assertOwnsResource(OTHER_ID, OWNER_ID, ROLE.SUPER_ADMIN)).not.toThrow();
        expect(() => assertOwnsResource(OTHER_ID, OWNER_ID, ROLE.FINANCE)).not.toThrow();
        expect(() => assertOwnsResource(OTHER_ID, OWNER_ID, ROLE.CREDIT_MANAGER)).not.toThrow();
        expect(() => assertOwnsResource(OTHER_ID, OWNER_ID, ROLE.ADMIN)).not.toThrow();
    });

    test('a non-staff role (CUSTOMER, AGENT) does not bypass the check', () => {
        expect(() => assertOwnsResource(OTHER_ID, OWNER_ID, ROLE.CUSTOMER)).toThrow(ForbiddenError);
        expect(() => assertOwnsResource(OTHER_ID, OWNER_ID, ROLE.AGENT)).toThrow(ForbiddenError);
    });

    test('null resourceOwnerId throws for a non-staff caller — does not silently pass', () => {
        expect(() => assertOwnsResource(OWNER_ID, null, ROLE.CUSTOMER)).toThrow(ForbiddenError);
    });

    test('undefined resourceOwnerId throws for a non-staff caller — does not silently pass', () => {
        expect(() => assertOwnsResource(OWNER_ID, undefined, ROLE.CUSTOMER)).toThrow(ForbiddenError);
    });

    test('null/undefined resourceOwnerId still bypasses for staff (staff check runs first)', () => {
        expect(() => assertOwnsResource(OWNER_ID, null, ROLE.SUPER_ADMIN)).not.toThrow();
        expect(() => assertOwnsResource(OWNER_ID, undefined, ROLE.SUPER_ADMIN)).not.toThrow();
    });

    test('error message includes the resource label when provided', () => {
        expect(() => assertOwnsResource(OTHER_ID, OWNER_ID, ROLE.CUSTOMER, 'grievance'))
            .toThrow('You can only access your own grievance');
    });

    test('error message defaults to "resource" when no label is given', () => {
        expect(() => assertOwnsResource(OTHER_ID, OWNER_ID, ROLE.CUSTOMER))
            .toThrow('You can only access your own resource');
    });
});

describe('assertApplicationOwnership', () => {
    test('does not throw when the application belongs to the caller', () => {
        expect(() => assertApplicationOwnership(OWNER_ID, { userId: OWNER_ID }, ROLE.CUSTOMER)).not.toThrow();
    });

    test('throws ForbiddenError when the application belongs to someone else', () => {
        expect(() => assertApplicationOwnership(OTHER_ID, { userId: OWNER_ID }, ROLE.CUSTOMER)).toThrow(ForbiddenError);
    });

    test('staff bypasses regardless of the application owner', () => {
        expect(() => assertApplicationOwnership(OTHER_ID, { userId: OWNER_ID }, ROLE.SUPER_ADMIN)).not.toThrow();
    });

    test('a null/undefined userId on the application throws for a non-staff caller', () => {
        expect(() => assertApplicationOwnership(OWNER_ID, { userId: null }, ROLE.CUSTOMER)).toThrow(ForbiddenError);
        expect(() => assertApplicationOwnership(OWNER_ID, { userId: undefined }, ROLE.CUSTOMER)).toThrow(ForbiddenError);
    });

    test('default resource label reads "loan application"', () => {
        expect(() => assertApplicationOwnership(OTHER_ID, { userId: OWNER_ID }, ROLE.CUSTOMER))
            .toThrow('You can only access your own loan application');
    });
});

describe('assertAccountOwnership', () => {
    test('does not throw when the account belongs to the caller', () => {
        expect(() => assertAccountOwnership(OWNER_ID, { userId: OWNER_ID }, ROLE.CUSTOMER)).not.toThrow();
    });

    test('throws ForbiddenError when the account belongs to someone else', () => {
        expect(() => assertAccountOwnership(OTHER_ID, { userId: OWNER_ID }, ROLE.CUSTOMER)).toThrow(ForbiddenError);
    });

    test('staff bypasses regardless of the account owner', () => {
        expect(() => assertAccountOwnership(OTHER_ID, { userId: OWNER_ID }, ROLE.SUPER_ADMIN)).not.toThrow();
    });

    test('a null/undefined userId on the account throws for a non-staff caller', () => {
        expect(() => assertAccountOwnership(OWNER_ID, { userId: null }, ROLE.CUSTOMER)).toThrow(ForbiddenError);
        expect(() => assertAccountOwnership(OWNER_ID, { userId: undefined }, ROLE.CUSTOMER)).toThrow(ForbiddenError);
    });

    test('default resource label reads "loan account"', () => {
        expect(() => assertAccountOwnership(OTHER_ID, { userId: OWNER_ID }, ROLE.CUSTOMER))
            .toThrow('You can only access your own loan account');
    });
});
