// src/modules/web/collections/collections.routes.ts
import { Router } from 'express';
import type { Response, NextFunction } from 'express';
import { collectionsService } from '@/modules/collections/collections.service';
import { requireAuth, allowRoles } from '@/middlewares';
import { HTTP, ROLE } from '@/config/constants';
import type { AuthRequest } from '@/types/express';

const router = Router();

const COLLECTION_ROLES = [
    ROLE.ADMIN, ROLE.SUPER_ADMIN,
    ROLE.COLLECTION_AGENT, ROLE.FINANCE,
];

const MANAGER_ROLES = [
    ROLE.ADMIN, ROLE.SUPER_ADMIN, ROLE.FINANCE,
];

// GET /collections/cases?status=&agentId=&minDays=&page=&limit=
router.get('/cases', requireAuth(), allowRoles(...COLLECTION_ROLES), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const user = req.user!;
        const { status, agentId, minDays, page, limit } = req.query;
        const result = await collectionsService.listCases({
            status:         status  as any,
            assignedTo:     agentId as string | undefined,
            
            page:           page  ? parseInt(page  as string, 10) : 1,
            limit:          limit ? parseInt(limit as string, 10) : 20,
        }, user.id, user.role);
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

// GET /collections/cases/:id
router.get('/cases/:id', requireAuth(), allowRoles(...COLLECTION_ROLES), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const user   = req.user!;
        const result = await collectionsService.getCase(
            req.params.id as string,
            user.id,
            user.role,
        );
        res.status(HTTP.OK).json(result);
    } catch (err) { next(err); }
});

// POST /collections/cases/:id/contact-log
router.post('/cases/:id/contact-log', requireAuth(), allowRoles(...COLLECTION_ROLES), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const user   = req.user!;
        const result = await collectionsService.logContact({
            caseId:   req.params.id as string,
            loggedBy: user.id,
            channel:  req.body.channel  ?? 'CALL',
            outcome:  req.body.outcome,
            notes:    req.body.notes    ?? '',
            ptpDate:  req.body.ptpDate  ? new Date(req.body.ptpDate) : undefined,
            ptpAmount: req.body.ptpAmount,
            paymentReceived: req.body.paymentReceived,
        }, req);
        res.status(HTTP.CREATED).json(result);
    } catch (err) { next(err); }
});

// PATCH /collections/cases/:id/assign
router.patch('/cases/:id/assign', requireAuth(), allowRoles(...MANAGER_ROLES), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const result = await collectionsService.assignCase({
            caseId:     req.params.id as string,
            assignTo:   req.body.agentId,
            assignedBy: req.user!.id,
        }, req);
        res.status(HTTP.OK).json(result);
    } catch (err) { next(err); }
});

// GET /collections/summary
router.get('/summary', requireAuth(), allowRoles(...MANAGER_ROLES), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const { prisma } = await import('@/config/database');

        const [totalOpen, totalEscalated, totalResolved] = await Promise.all([
            prisma.collection_cases.count({ where: { status: 'OPEN' } }),
            prisma.collection_cases.count({ where: { status: 'ESCALATED' } }),
            prisma.collection_cases.count({ where: { status: 'RESOLVED' } }),
        ]);

        res.status(HTTP.OK).json({ totalOpen, totalEscalated, totalResolved });
    } catch (err) { next(err); }
});

export { router as collectionsWebRouter };