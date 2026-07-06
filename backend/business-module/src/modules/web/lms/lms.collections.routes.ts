// src/modules/web/lms/lms.collections.routes.ts
import { Router } from 'express';
import type { Response, NextFunction } from 'express';
import { requireAuth, allowRoles } from '@/middlewares';
import { ROLE, HTTP } from '@/config/constants';
import type { AuthRequest } from '@/types/express';
import { collectionsService } from '@/modules/collections';

const router = Router();

const LMS_ROLES = [
    ROLE.SUPER_ADMIN, ROLE.ADMIN,
    ROLE.FINANCE, ROLE.COLLECTION_AGENT,
    ROLE.CREDIT_MANAGER, ROLE.OPS_EXECUTIVE,
];

const MANAGER_ROLES = [
    ROLE.SUPER_ADMIN, ROLE.ADMIN, ROLE.FINANCE,
];

// GET /lms/collections/cases?status=&assignedTo=&page=&limit=
router.get('/cases', requireAuth(), allowRoles(...LMS_ROLES), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const user = req.user!;
        const { status, assignedTo, page, limit } = req.query;
        const result = await collectionsService.listCases({
status:     status as any,
            assignedTo: assignedTo as string | undefined,
            page:       page  ? parseInt(page  as string, 10) : 1,
            limit:      limit ? parseInt(limit as string, 10) : 20,
        }, user.id, user.role);
        res.status(HTTP.OK).json(result);
    } catch (err) { next(err); }
});

// GET /lms/collections/cases/:id
router.get('/cases/:id', requireAuth(), allowRoles(...LMS_ROLES), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const user = req.user!;
        const result = await collectionsService.getCase(
            req.params.id as string,
            user.id,
            user.role,
        );
        res.status(HTTP.OK).json({ success: true, data: result });
    } catch (err) { next(err); }
});

// POST /lms/collections/cases/:id/contact-log
router.post('/cases/:id/contact-log', requireAuth(), allowRoles(...LMS_ROLES), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const user = req.user!;
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
        res.status(HTTP.CREATED).json({ success: true, data: result });
    } catch (err) { next(err); }
});

// PATCH /lms/collections/cases/:id/assign
router.patch('/cases/:id/assign', requireAuth(), allowRoles(...MANAGER_ROLES), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const result = await collectionsService.assignCase({
            caseId:     req.params.id as string,
            assignTo:   req.body.agentId,
            assignedBy: req.user!.id,
        }, req);
        res.status(HTTP.OK).json({ success: true, data: result });
    } catch (err) { next(err); }
});

// POST /lms/collections/cases/:id/close
router.post('/cases/:id/close', requireAuth(), allowRoles(...MANAGER_ROLES), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const result = await collectionsService.closeCase({
            caseId:   req.params.id as string,
            closedBy: req.user!.id,
            status:   'RESOLVED' as const,
            reason:   req.body.reason ?? 'Resolved',
        }, req);
        res.status(HTTP.OK).json({ success: true, data: result });
    } catch (err) { next(err); }
});

// GET /lms/collections/summary
router.get('/summary', requireAuth(), allowRoles(...MANAGER_ROLES), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const result = await collectionsService.getPortfolioSummary();
        res.status(HTTP.OK).json({ success: true, data: result });
    } catch (err) { next(err); }
});

export { router as lmsCollectionsRouter };