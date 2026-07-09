// src/middlewares/staffRbac.middleware.ts
//
// Authorisation for staff (web dashboard) routes. Place AFTER verifyStaffToken.
//   • requireModule(module) → role must have access to that dashboard module.
//   • allowStaffRoles(...)  → role must be one of the listed staff roles.
// ADMIN passes every check.

import type { Request, Response, NextFunction } from 'express';
import { ForbiddenError } from '@/errors';
import {
    STAFF_ROLE,
    canAccess,
    type ModuleKey,
    type StaffRole,
} from '@/constants/staffRoles.constants';

function requireStaff(req: Request): StaffRole {
    if (!req.staffUser) {
        throw new ForbiddenError('Authentication required before authorization check');
    }
    return req.staffUser.role;
}

/** Gate a route by web-dashboard module access. */
export function requireModule(module: ModuleKey) {
    return (req: Request, _res: Response, next: NextFunction): void => {
        try {
            const role = requireStaff(req);
            if (role === STAFF_ROLE.ADMIN || canAccess(role, module)) return next();
            next(new ForbiddenError(`Your role does not include the "${module}" module.`));
        } catch (e) {
            next(e);
        }
    };
}

/** Gate a route by an explicit list of staff roles (ADMIN always allowed). */
export function allowStaffRoles(...roles: StaffRole[]) {
    return (req: Request, _res: Response, next: NextFunction): void => {
        try {
            const role = requireStaff(req);
            if (role === STAFF_ROLE.ADMIN || roles.includes(role)) return next();
            next(new ForbiddenError('You do not have permission to perform this action.'));
        } catch (e) {
            next(e);
        }
    };
}
