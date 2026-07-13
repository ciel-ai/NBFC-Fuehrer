// src/modules/web/lms/lms.reports.routes.ts
import { Router } from 'express';
import type { Response, NextFunction } from 'express';
import { requireAuth, allowRoles } from '@/middlewares';
import { ROLE, HTTP } from '@/config/constants';
import type { AuthRequest } from '@/types/express';
import { reportsService } from '@/modules/reports';
import type { ReportFormat } from '@/modules/reports/reports.types';

const router = Router();

const LMS_ROLES = [
    ROLE.SUPER_ADMIN, ROLE.ADMIN,
    ROLE.FINANCE, ROLE.CREDIT_MANAGER,
];

// GET /lms/reports/portfolio?from=&to=&format=json|csv
router.get('/portfolio', requireAuth(), allowRoles(...LMS_ROLES), async (req: AuthRequest, res: Response, next: NextFunction) => {
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
            res.setHeader('Content-Disposition', 'attachment; filename="lms_portfolio.csv"');
            res.status(HTTP.OK).send(result.data);
        } else {
            res.status(HTTP.OK).json(result);
        }
    } catch (err) { next(err); }
});

// GET /lms/reports/overdue?from=&to=&format=json|csv
router.get('/overdue', requireAuth(), allowRoles(...LMS_ROLES), async (req: AuthRequest, res: Response, next: NextFunction) => {
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
            res.setHeader('Content-Disposition', 'attachment; filename="lms_overdue.csv"');
            res.status(HTTP.OK).send(result.data);
        } else {
            res.status(HTTP.OK).json(result);
        }
    } catch (err) { next(err); }
});

// GET /lms/reports/npa?from=&to=&format=json|csv
router.get('/npa', requireAuth(), allowRoles(...LMS_ROLES), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const user = req.user!;
        const { from, to, format } = req.query;
        const fmt = ((format as string) ?? 'json') as ReportFormat;

        const result = await reportsService.getRbiReturn({
            reportType: 'NPA_CLASSIFICATION' as const,
            periodEnd:  to ? new Date(to as string) : new Date(),
            format:     fmt,
        }, user.role);

        if (fmt === 'csv') {
            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', 'attachment; filename="lms_npa.csv"');
            res.status(HTTP.OK).send(result.data);
        } else {
            res.status(HTTP.OK).json(result);
        }
    } catch (err) { next(err); }
});

// GET /lms/reports/aum?asOfDate=
router.get('/aum', requireAuth(), allowRoles(...LMS_ROLES), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const { asOfDate } = req.query;
        const result = await reportsService.getAumReport({
            asOfDate: asOfDate ? new Date(asOfDate as string) : undefined,
        });
        res.status(HTTP.OK).json(result);
    } catch (err) { next(err); }
});


export { router as lmsReportsRouter };