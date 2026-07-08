// src/modules/web/lms/lms.reconciliation.routes.ts
import { Router } from 'express';
import type { Response, NextFunction } from 'express';
import { requireAuth, allowRoles } from '@/middlewares';
import { ROLE, HTTP } from '@/config/constants';
import type { AuthRequest } from '@/types/express';
import { reconciliationService } from '@/modules/reconciliation/reconciliation.service';

const router = Router();

const FINANCE_ROLES = [
    ROLE.SUPER_ADMIN, ROLE.ADMIN, ROLE.FINANCE,
];

// GET /lms/reconciliation?reportType=&from=&to=&page=&limit=
router.get('/', requireAuth(), allowRoles(...FINANCE_ROLES), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const { reportType, from, to, page, limit } = req.query;
        const result = await reconciliationService.listReports({
            reportType: reportType as string | undefined,
            fromDate:   from ? new Date(from as string) : undefined,
            toDate:     to   ? new Date(to   as string) : undefined,
            page:       page  ? parseInt(page  as string, 10) : 1,
            limit:      limit ? parseInt(limit as string, 10) : 20,
        });
        res.status(HTTP.OK).json({ success: true, ...result });
    } catch (err) { next(err); }
});

// GET /lms/reconciliation/:id — single report detail
router.get('/:id', requireAuth(), allowRoles(...FINANCE_ROLES), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const result = await reconciliationService.getReport(req.params.id as string);
        if (!result) {
            res.status(HTTP.NOT_FOUND).json({ success: false, message: 'Report not found' });
            return;
        }
        res.status(HTTP.OK).json({ success: true, data: result });
    } catch (err) { next(err); }
});

// POST /lms/reconciliation/run — manually trigger reconciliation
router.post('/run', requireAuth(), allowRoles(ROLE.SUPER_ADMIN, ROLE.ADMIN), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const { date } = req.body;
        await reconciliationService.runAll(date ? new Date(date) : new Date());
        res.status(HTTP.OK).json({ success: true, message: 'Reconciliation completed' });
    } catch (err) { next(err); }
});

export { router as lmsReconciliationRouter };