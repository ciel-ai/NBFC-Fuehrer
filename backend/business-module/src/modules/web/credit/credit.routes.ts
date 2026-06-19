// src/modules/web/credit/credit.routes.ts
//
// Credit workbench routes for the web dashboard — queue, summary, and
// decisioning. Wraps loansService; no new business logic, no new tables.
// Frontend store-action map: creditDecision -> POST /credit-decision

import { Router } from 'express';
import type { Response, NextFunction } from 'express';
import { loansService } from '@/modules/loans/loans.service';
import { requireAuth, allowRoles } from '@/middlewares';
import { HTTP, LOAN_STATUS, ROLE } from '@/config/constants';
import type { AuthRequest } from '@/types/express';

const router = Router();

const CREDIT_ROLES = [
    ROLE.CREDIT_CDL, ROLE.CREDIT_GOLD, ROLE.CREDIT_HOUSING,
    ROLE.CREDIT_MANAGER, ROLE.ADMIN, ROLE.SUPER_ADMIN,
];

// GET /credit/queue?tab=pending|approved|rejected|returned
router.get('/queue', requireAuth(), allowRoles(...CREDIT_ROLES), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const { tab, page, limit } = req.query;

        const statusByTab: Record<string, string> = {
            pending: LOAN_STATUS.PENDING_APPROVAL,
            approved: LOAN_STATUS.APPROVED,
            rejected: LOAN_STATUS.REJECTED,
            returned: LOAN_STATUS.KYC_REJECTED, // closest existing equivalent to "returned"
        };

        const filters: any = {
            page: page ? parseInt(page as string, 10) : 1,
            limit: limit ? parseInt(limit as string, 10) : 20,
            status: statusByTab[(tab as string) ?? 'pending'] ?? LOAN_STATUS.PENDING_APPROVAL,
        };

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

// GET /credit/summary -> {pendingReviews, approvedToday, rejectedToday, returned}
router.get('/summary', requireAuth(), allowRoles(...CREDIT_ROLES), async (_req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);

        const [pending, approvedToday, rejectedToday] = await Promise.all([
            loansService.listApplications({ page: 1, limit: 1, status: LOAN_STATUS.PENDING_APPROVAL }),
            loansService.listApplications({ page: 1, limit: 1, status: LOAN_STATUS.APPROVED, fromDate: today, toDate: tomorrow }),
            loansService.listApplications({ page: 1, limit: 1, status: LOAN_STATUS.REJECTED, fromDate: today, toDate: tomorrow }),
        ]);

        res.status(HTTP.OK).json({
            pendingReviews: pending.pagination?.total ?? 0,
            approvedToday: approvedToday.pagination?.total ?? 0,
            rejectedToday: rejectedToday.pagination?.total ?? 0,
            returned: 0, // no dedicated "returned" status yet in state machine
        });
    } catch (err) { next(err); }
});

// POST /applications/:id/credit-decision
// { decision: APPROVED|REJECTED, riskGrade, remarks, approvedAmount?, approvedTenure?, approvedRate?, reason? }
router.post('/decision/:id', requireAuth(), allowRoles(...CREDIT_ROLES), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;
        const user = (req as any).user;
        const { decision, approvedAmount, approvedRate, reason } = req.body;

        let result;
        if (decision === 'APPROVED') {
            result = await loansService.approveLoan({
                loanId: id as string,
                approvedBy: user.id,
                approvedAmount,
                interestRate: approvedRate,
                processingFee: req.body.processingFee ?? 0,
            }, req);
        } else {
            result = await loansService.rejectLoan({
                loanId: id as string,
                rejectedBy: user.id,
                reason: reason ?? 'No reason provided',
            }, req);
        }

        res.status(HTTP.OK).json(result);
    } catch (err) { next(err); }
});

export { router as creditRouter };