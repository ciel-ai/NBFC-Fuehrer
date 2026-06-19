// src/modules/web/applications/applications.routes.ts
//
// Routes matching the web dashboard frontend's expected API shape.
// Wraps the existing loansService — same DB, same business logic,
// just a different path/response shape so the frontend can consume it
// without modification. Mobile app keeps using /api/v1/loans unchanged.
//
// NOTE: Gold Loan and Housing Loan applications currently live in
// their own modules (goldLoans, housingLoans) with separate tables.
// This route currently surfaces CDL applications from loan_applications.
// TODO: merge in gold/housing applications once those modules expose
// a matching list method, or query all three and merge here.

import { Router } from 'express';
import type { Response, NextFunction } from 'express';
import { loansService } from '@/modules/loans/loans.service';
import { requireAuth } from '@/middlewares';
import { HTTP } from '@/config/constants';
import type { AuthRequest } from '@/types/express';

const router = Router();

// GET /applications?status=&loanType=&from=&to=
router.get('/', requireAuth(), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const { status, page, limit, fromDate, toDate, sortBy, sortOrder } = req.query;

        const filters: any = {
            page: page ? parseInt(page as string, 10) : 1,
            limit: limit ? parseInt(limit as string, 10) : 20,
            sortBy: (sortBy as string) ?? 'appliedAt',
            sortOrder: (sortOrder as string) ?? 'desc',
        };

        // Status bucket presets per frontend spec — map to underlying single status
        // until the repository supports an `in` filter natively.
        if (status === 'FINANCE_BUCKET') {
            filters.status = 'APPROVED';
        } else if (status === 'DISBURSED_BUCKET') {
            filters.status = 'DISBURSED';
        } else if (status) {
            filters.status = status;
        }

        if (fromDate) filters.fromDate = new Date(fromDate as string);
        if (toDate) filters.toDate = new Date(toDate as string);

        const result = await loansService.listApplications(filters);

        res.status(HTTP.OK).json({
            data: result.data ?? result,
            meta: {
                page: filters.page,
                pageSize: filters.limit,
                total: result.pagination?.total ?? 0,
            },
        });
    } catch (err) { next(err); }
});

// GET /applications/:id — full aggregate detail
router.get('/:id', requireAuth(), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;
        const user = (req as any).user;
        const result = await loansService.getApplication(id as string, user.id, user.role);
        res.status(HTTP.OK).json(result);
    } catch (err) { next(err); }
});

export { router as applicationsRouter };