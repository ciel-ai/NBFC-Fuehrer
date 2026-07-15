// src/modules/web/grievances/grievances.routes.ts
//
// Staff-side grievance management — list all, assign to staff, transition status.
// Customer-facing routes (raise, view own) live at modules/grievances/grievances.routes.ts.

import { Router } from 'express';
import type { Response, NextFunction } from 'express';
import { requireAuth, allowRoles } from '@/middlewares';
import { ROLE, HTTP } from '@/config/constants';
import type { AuthRequest } from '@/types/express';
import { getAuthUser } from '@/types/express';
import { grievancesService } from '@/modules/grievances';
import { parsePagination } from '@/types/common.types';

const router = Router();

const GRIEVANCE_STAFF_ROLES = [
    ROLE.SUPER_ADMIN, ROLE.ADMIN, ROLE.OPS_EXECUTIVE,
];

// GET /grievances — list all grievances (staff), filterable
router.get('/', requireAuth(), allowRoles(...GRIEVANCE_STAFF_ROLES), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const params = parsePagination(req.query);
        const result = await grievancesService.listAll(
            {
                status: req.query.status as string | undefined,
                category: req.query.category as string | undefined,
                priority: req.query.priority as string | undefined,
            },
            params,
        );
        res.status(HTTP.OK).json({ success: true, data: result.data, meta: { pagination: result.pagination } });
    } catch (err) { next(err); }
});

// GET /grievances/:id — view a specific grievance (staff)
router.get('/:id', requireAuth(), allowRoles(...GRIEVANCE_STAFF_ROLES), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const grievance = await grievancesService.getById(req.params.id as string);
        res.status(HTTP.OK).json({ success: true, data: grievance });
    } catch (err) { next(err); }
});

// POST /grievances/:id/assign — assign to self or another staff member
router.post('/:id/assign', requireAuth(), allowRoles(...GRIEVANCE_STAFF_ROLES), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const user = getAuthUser(req);
        const staffUserId = req.body.staffUserId ?? user.id;
        const grievance = await grievancesService.assign(req.params.id as string, staffUserId);
        res.status(HTTP.OK).json({ success: true, data: grievance });
    } catch (err) { next(err); }
});

// PATCH /grievances/:id/status — transition status (in-progress/resolved/escalated/closed)
router.patch('/:id/status', requireAuth(), allowRoles(...GRIEVANCE_STAFF_ROLES), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const grievance = await grievancesService.transitionStatus(
            req.params.id as string,
            req.body.status,
            req.body.notes,
        );
        res.status(HTTP.OK).json({ success: true, data: grievance });
    } catch (err) { next(err); }
});

export { router as grievancesWebRouter };