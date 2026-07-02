// src/modules/web/reports/reports.routes.ts
import { Router } from 'express';
import type { Response, NextFunction } from 'express';
import { reportsService } from '@/modules/reports/reports.service';
import { requireAuth, allowRoles } from '@/middlewares';
import { HTTP, ROLE } from '@/config/constants';
import type { AuthRequest } from '@/types/express';
import type { ReportFormat } from '@/modules/reports/reports.types';

const router = Router();

const REPORT_ROLES = [
    ROLE.ADMIN, ROLE.SUPER_ADMIN,
    ROLE.FINANCE, ROLE.CREDIT_MANAGER,
];

const FINANCE_ROLES = [
    ROLE.ADMIN, ROLE.SUPER_ADMIN, ROLE.FINANCE,
];

// GET /reports/portfolio?from=&to=&format=json|csv
router.get('/portfolio', requireAuth(), allowRoles(...REPORT_ROLES), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const user = req.user!;
        const { from, to, format } = req.query;
        const fmt = ((format as string) ?? 'json') as ReportFormat;

        const result = await reportsService.getPortfolioMIS({
            fromDate: from ? new Date(from as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
            toDate:   to   ? new Date(to   as string) : new Date(),
            format:   fmt,
        }, user.role);

        if (fmt === 'csv') {
            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', 'attachment; filename="portfolio_report.csv"');
            res.status(HTTP.OK).send(result.data);
        } else {
            res.status(HTTP.OK).json(result);
        }
    } catch (err) { next(err); }
});

// GET /reports/collection?from=&to=&format=json|csv
router.get('/collection', requireAuth(), allowRoles(...REPORT_ROLES), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const user = req.user!;
        const { from, to, format } = req.query;
        const fmt = ((format as string) ?? 'json') as ReportFormat;

        const result = await reportsService.getCollectionEfficiency({
            fromDate: from ? new Date(from as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
            toDate:   to   ? new Date(to   as string) : new Date(),
            format:   fmt,
        }, user.role);

        if (fmt === 'csv') {
            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', 'attachment; filename="collection_report.csv"');
            res.status(HTTP.OK).send(result.data);
        } else {
            res.status(HTTP.OK).json(result);
        }
    } catch (err) { next(err); }
});

// GET /reports/rbi?from=&to=&format=json|csv
router.get('/rbi', requireAuth(), allowRoles(...FINANCE_ROLES), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const user = req.user!;
        const { from, to, format } = req.query;
        const fmt = ((format as string) ?? 'json') as ReportFormat;

        const result = await reportsService.getRbiReturn({
            reportType: (req.query.reportType as any) ?? 'FORM_A',
            periodEnd:  to ? new Date(to as string) : new Date(),
            format:     fmt,
        }, user.role);

        if (fmt === 'csv') {
            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', 'attachment; filename="rbi_return.csv"');
            res.status(HTTP.OK).send(result.data);
        } else {
            res.status(HTTP.OK).json(result);
        }
    } catch (err) { next(err); }
});

export { router as reportsWebRouter };