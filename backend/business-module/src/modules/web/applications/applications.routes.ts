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
import { requireAuth, allowRoles } from '@/middlewares';
import { ROLE } from '@/constants/roles.constants';
import { HTTP } from '@/config/constants';
import type { AuthRequest } from '@/types/express';

const router = Router();

// GET /applications?status=&loanType=&from=&to=
router.get('/', requireAuth(), allowRoles(ROLE.OPS_EXECUTIVE, ROLE.CREDIT_MANAGER, ROLE.ADMIN, ROLE.SUPER_ADMIN), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const { status, productType, page, limit, fromDate, toDate, sortBy, sortOrder } = req.query;

        const filters: any = {
            page: page ? parseInt(page as string, 10) : 1,
            limit: limit ? parseInt(limit as string, 10) : 20,
            sortBy: (sortBy as string) ?? 'appliedAt',
            sortOrder: (sortOrder as string) ?? 'desc',
        };

        if (productType) filters.productType = productType as string;

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

        // Join customer identity — list rows carry userId only, but the
        // dashboard renders name/phone on every row (and the Customers
        // screens aggregate by phone).
        const rows: any[] = result.data ?? result;
        const userIds = [...new Set(rows.map((r: any) => r.userId).filter(Boolean))];
        const { prisma } = await import('@/config/database');
        const users = userIds.length
            ? await prisma.users.findMany({
                where: { id: { in: userIds as string[] } },
                select: { id: true, full_name: true, phone: true, email: true },
            })
            : [];
        const byId = new Map(users.map((u) => [u.id, u]));
        const data = rows.map((r: any) => ({
            ...r,
            customer: r.customer ?? (byId.get(r.userId)
                ? {
                    name: byId.get(r.userId)!.full_name,
                    phone: byId.get(r.userId)!.phone,
                    email: byId.get(r.userId)!.email,
                }
                : null),
        }));

        res.status(HTTP.OK).json({
            data,
            meta: {
                page: filters.page,
                pageSize: filters.limit,
                total: result.pagination?.total ?? 0,
            },
        });
    } catch (err) { next(err); }
});

// GET /applications/:id — full aggregate detail
router.get('/:id', requireAuth(), allowRoles(ROLE.OPS_EXECUTIVE, ROLE.CREDIT_MANAGER, ROLE.ADMIN, ROLE.SUPER_ADMIN), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;
        const user = (req as any).user;
        const result = await loansService.getApplication(id as string, user.id, user.role);
        res.status(HTTP.OK).json(result);
    } catch (err) { next(err); }
});

export { router as applicationsRouter };