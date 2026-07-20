// src/utils/ownership.util.ts
//
// Shared ownership-check helper — the single utility every IDOR fix in the
// audit series should route through, instead of each route/service hand-rolling
// its own `if (resource.userId !== req.user.id)` check.
//
// This formalizes the pattern that already existed correctly in exactly one
// place (loans.service.ts's getLoanAccount) and generalizes it so every other
// customer-scoped resource (applications, grievances, payments/mandates,
// gold-loan appraisals, housing-loan applications, ...) can reuse the same
// checked, tested logic rather than each getting its own bespoke — and easily
// forgotten — comparison.
//
// Usage (service layer, after fetching the resource):
//
//   const application = await applicationsRepository.findByIdOrThrow(id);
//   assertOwnsResource(userId, application.userId, role, 'loan application');
//   return toApplicationResponse(application);
//
// Staff roles (per isStaffRole()) always pass — they're expected to access
// any customer's resources. Everyone else must match the resource's owner.

import { ForbiddenError } from '@/errors';
import { isStaffRole } from '@/constants/roles.constants';
import type { Role } from '@/config/constants';

/**
 * Throws ForbiddenError unless the caller is staff or the resource's owner.
 *
 * @param callerId       req.user.id — the authenticated caller's user id
 * @param resourceOwnerId The resource's owning user id (e.g. application.userId)
 * @param callerRole     req.user.role
 * @param resourceLabel  Human-readable resource name for the error message,
 *                       e.g. 'loan application', 'grievance', 'payment record'.
 */
export function assertOwnsResource(
    callerId: string,
    resourceOwnerId: string | null | undefined,
    callerRole: Role,
    resourceLabel = 'resource',
): void {
    if (isStaffRole(callerRole)) return;

    if (!resourceOwnerId || resourceOwnerId !== callerId) {
        throw new ForbiddenError(`You can only access your own ${resourceLabel}`);
    }
}

/**
 * Same check, named for application-level resources (loan applications,
 * grievances, KYC records) — reads more clearly at call sites than the
 * generic function, and gives us one place to diverge behavior later
 * (e.g. co-applicants) if application-level and account-level ownership
 * rules ever need to differ.
 */
export function assertApplicationOwnership(
    callerId: string,
    application: { userId: string | null | undefined },
    callerRole: Role,
    resourceLabel = 'loan application',
): void {
    assertOwnsResource(callerId, application.userId, callerRole, resourceLabel);
}

/**
 * Same check, for settled loan accounts (post-disbursement) — gold-loan
 * monitoring/closure-quote, housing-loan EMI schedule/prepayment/NOC, etc.
 */
export function assertAccountOwnership(
    callerId: string,
    account: { userId: string | null | undefined },
    callerRole: Role,
    resourceLabel = 'loan account',
): void {
    assertOwnsResource(callerId, account.userId, callerRole, resourceLabel);
}