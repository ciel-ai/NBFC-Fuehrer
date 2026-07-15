// src/modules/grievances/grievances.routes.ts
//
// Customer-facing grievance routes — raise a complaint, view own complaints.
// Staff-side management (list all, assign, resolve) lives separately under
// modules/web/grievances, mirroring the loans/ vs web/lms split elsewhere.

import { Router } from 'express';
import type { Response, NextFunction } from 'express';
import { requireAuth } from '@/middlewares';
import { HTTP } from '@/config/constants';
import type { AuthRequest } from '@/types/express';
import { getAuthUser } from '@/types/express';
import { grievancesService } from './grievances.service';
import { parsePagination } from '@/types/common.types';

const router = Router();

// POST /grievances — raise a new grievance
router.post('/', requireAuth(), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const user = getAuthUser(req);
        const grievance = await grievancesService.create({
            userId: user.id,
            loanAccountId: req.body.loanAccountId,
            category: req.body.category,
            description: req.body.description,
            priority: req.body.priority,
        });
        res.status(HTTP.CREATED).json({ success: true, data: grievance });
    } catch (err) { next(err); }
});

// GET /grievances — list own grievances
router.get('/', requireAuth(), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const user = getAuthUser(req);
        const params = parsePagination(req.query);
        const result = await grievancesService.listForUser(user.id, params);
        res.status(HTTP.OK).json({ success: true, data: result.data, meta: { pagination: result.pagination } });
    } catch (err) { next(err); }
});

// GET /grievances/:id — view a specific grievance
router.get('/:id', requireAuth(), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const grievance = await grievancesService.getById(req.params.id as string);
        res.status(HTTP.OK).json({ success: true, data: grievance });
    } catch (err) { next(err); }
});

export { router as grievancesRouter };