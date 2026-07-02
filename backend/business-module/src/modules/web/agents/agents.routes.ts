// src/modules/web/agents/agents.routes.ts
import { Router } from 'express';
import type { Response, NextFunction } from 'express';
import { agentsService } from '@/modules/agents/agents.service';
import { requireAuth, allowRoles } from '@/middlewares';
import { HTTP, ROLE } from '@/config/constants';
import type { AuthRequest } from '@/types/express';

const router = Router();

const ADMIN_ROLES   = [ROLE.ADMIN, ROLE.SUPER_ADMIN];
const MANAGER_ROLES = [ROLE.ADMIN, ROLE.SUPER_ADMIN, ROLE.CREDIT_MANAGER, ROLE.OPS_EXECUTIVE];

// GET /agents?status=&search=&page=&limit=
router.get('/', requireAuth(), allowRoles(...MANAGER_ROLES), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const { status, search, page, limit } = req.query;
        const result = await agentsService.listAgents({
            status:  status as any,
            search:  search as string | undefined,
            page:    page  ? parseInt(page  as string, 10) : 1,
            limit:   limit ? parseInt(limit as string, 10) : 20,
        });
        res.status(HTTP.OK).json({
            data: result.data,
            meta: {
                page:     result.pagination?.page  ?? 1,
                pageSize: result.pagination?.limit ?? 20,
                total:    result.pagination?.total ?? 0,
            },
        });
    } catch (err) { next(err); }
});

// GET /agents/:id
router.get('/:id', requireAuth(), allowRoles(...MANAGER_ROLES), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const user   = req.user!;
        const result = await agentsService.getAgent(
            req.params.id as string,
            user.id,
            user.role,
        );
        res.status(HTTP.OK).json(result);
    } catch (err) { next(err); }
});

// POST /agents
router.post('/', requireAuth(), allowRoles(...ADMIN_ROLES), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const result = await agentsService.onboardAgent(req.body, req);
        res.status(HTTP.CREATED).json(result);
    } catch (err) { next(err); }
});

// PATCH /agents/:id
router.patch('/:id', requireAuth(), allowRoles(...ADMIN_ROLES), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const user   = req.user!;
        const result = await agentsService.updateProfile(
            req.params.id as string,
            user.id,
            user.role,
            req.body,
            req,
        );
        res.status(HTTP.OK).json(result);
    } catch (err) { next(err); }
});

// POST /agents/:id/activate
router.post('/:id/activate', requireAuth(), allowRoles(...ADMIN_ROLES), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const user   = req.user!;
        const result = await agentsService.activateAgent(
            req.params.id as string,
            user.id,
            req as any,
        );
        res.status(HTTP.OK).json({ id: result.id, status: result.status });
    } catch (err) { next(err); }
});

// POST /agents/:id/deactivate
router.post('/:id/deactivate', requireAuth(), allowRoles(...ADMIN_ROLES), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const user   = req.user!;
        const result = await agentsService.suspendAgent({
            agentId:     req.params.id as string,
            suspendedBy: user.id,
            reason:      req.body.reason ?? 'Deactivated via Admin Panel',
        }, req);
        res.status(HTTP.OK).json({ id: result.id, status: result.status });
    } catch (err) { next(err); }
});

// GET /agents/:id/commissions
router.get('/:id/commissions', requireAuth(), allowRoles(...MANAGER_ROLES), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const user   = req.user!;
        const { page, limit } = req.query;
        const result = await agentsService.listCommissions(
            req.params.id as string,
            {
                page:  page  ? parseInt(page  as string, 10) : 1,
                limit: limit ? parseInt(limit as string, 10) : 20,
            },
            user.id,
            user.role,
        );
        res.status(HTTP.OK).json(result);
    } catch (err) { next(err); }
});

export { router as agentsWebRouter };