// src/modules/web/finance/finance.routes.ts
//
// Finance workbench routes for the web dashboard — queue, summary, and
// disbursement trigger. Wraps loansService + disbursementService; no new
// business logic, no new tables. Queue/summary query Prisma directly
// (same pattern as the admin module) since no list-all method exists
// yet on the disbursement repository — that's a thin read, not a rule.

import { Router } from 'express';
import type { Response, NextFunction } from 'express';
import { loansService } from '@/modules/loans/loans.service';
import { disbursementService } from '@/modules/disbursement/disbursement.service';
import { requireAuth, allowRoles } from '@/middlewares';
import { HTTP, LOAN_STATUS, ROLE } from '@/config/constants';
import type { AuthRequest } from '@/types/express';

const router = Router();

const FINANCE_ROLES = [
    ROLE.FINANCE_CDL, ROLE.FINANCE_GOLD, ROLE.FINANCE_HOUSING,
    ROLE.FINANCE, ROLE.ADMIN, ROLE.SUPER_ADMIN,
];

// GET /finance/queue?tab=pending|emandates|disbursed
router.get('/queue', requireAuth(), allowRoles(...FINANCE_ROLES), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const { tab, page, limit } = req.query;
        const filters: any = {
            page: page ? parseInt(page as string, 10) : 1,
            limit: limit ? parseInt(limit as string, 10) : 20,
        };

        if (tab === 'disbursed') {
            filters.status = LOAN_STATUS.DISBURSED;
        } else {
            // 'pending' and 'emandates' both draw from APPROVED awaiting next step
            // until eNACH lifecycle has its own status — see Phase D/E.
            filters.status = LOAN_STATUS.APPROVED;
        }

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

// GET /finance/summary -> {pendingCount, pendingAmount, emandatePending, disbursedToday{count,amount}}
router.get('/summary', requireAuth(), allowRoles(...FINANCE_ROLES), async (_req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const { prisma } = await import('@/config/database');
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);

        const [pendingAgg, disbursedTodayAgg] = await Promise.all([
            prisma.loan_applications.aggregate({
                where: { status: LOAN_STATUS.APPROVED },
                _count: { id: true },
                _sum: { approved_amount: true },
            }),
            prisma.disbursements.aggregate({
                where: {
                    status: 'COMPLETED',
                    completed_at: { gte: today, lt: tomorrow },
                },
                _count: { id: true },
                _sum: { net_disbursed_amount: true },
            }),
        ]);

        res.status(HTTP.OK).json({
            pendingCount: pendingAgg._count.id,
            pendingAmount: pendingAgg._sum.approved_amount ?? 0,
            emandatePending: 0, // eNACH lifecycle not yet modeled — see Phase E
            disbursedToday: {
                count: disbursedTodayAgg._count?.id ?? 0,
                amount: disbursedTodayAgg._sum?.net_disbursed_amount ?? 0,
            },
        });
    } catch (err) { next(err); }
});

// POST /applications/:id/disburse  { beneficiaryName, accountNumber, ifsc, mode }
router.post('/disburse/:id', requireAuth(), allowRoles(...FINANCE_ROLES), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;
        const user = (req as any).user;
        const { beneficiaryName, accountNumber, ifsc, mode } = req.body;

        const result = await disbursementService.initiateDisbursement({
            loanId: id as string,
            initiatedBy: user.id,
            beneficiaryName,
            accountNumber,
            ifsc,
            mode,
        }, req);

        res.status(HTTP.CREATED).json(result);
    } catch (err) { next(err); }
});

export { router as financeRouter };