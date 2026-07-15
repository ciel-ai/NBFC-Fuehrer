// src/modules/web/lms/lms.loans.routes.ts
import { Router } from 'express';
import type { Response, NextFunction } from 'express';
import { requireAuth, allowRoles } from '@/middlewares';
import { ROLE, HTTP } from '@/config/constants';
import type { AuthRequest } from '@/types/express';
import { loansRepository } from '@/modules/loans/loans.repository';
import { emiService } from '@/modules/emi';
import { paymentsService } from '@/modules/payments';
import { isWithinCoolingOffPeriod, computeCoolingOffPayoff } from '@/modules/emi/emi.calculator';
import { COOLING_OFF_PERIOD_DAYS } from '@/config/nbfc.constants';
import { DomainError } from '@/errors';

const router = Router();

const LMS_ROLES = [
    ROLE.SUPER_ADMIN, ROLE.ADMIN,
    ROLE.FINANCE, ROLE.COLLECTION_AGENT,
    ROLE.CREDIT_MANAGER, ROLE.OPS_EXECUTIVE,
];

// GET /lms/loans?status=&userId=&page=&limit=
router.get('/', requireAuth(), allowRoles(...LMS_ROLES), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const { status, userId, page, limit, sortBy, sortOrder } = req.query;
        const result = await loansRepository.listApplications({
            userId:    userId    as string | undefined,
            status:    status    as any,
            page:      page  ? parseInt(page  as string, 10) : 1,
            limit:     limit ? parseInt(limit as string, 10) : 20,
            sortBy:    (sortBy    as any) ?? 'appliedAt',
            sortOrder: (sortOrder as any) ?? 'desc',
        });
        res.status(HTTP.OK).json(result);
    } catch (err) { next(err); }
});

// GET /lms/loans/:id
router.get('/:id', requireAuth(), allowRoles(...LMS_ROLES), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const account = await loansRepository.findAccountByIdOrThrow(req.params.id as string);
        res.status(HTTP.OK).json({ success: true, data: account });
    } catch (err) { next(err); }
});

// GET /lms/loans/:id/emi-schedule
router.get('/:id/emi-schedule', requireAuth(), allowRoles(...LMS_ROLES), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const result = await emiService.getSchedule({
            loanAccountId: req.params.id as string,
        });
        res.status(HTTP.OK).json({ success: true, data: result });
    } catch (err) { next(err); }
});

// GET /lms/loans/:id/emi-summary
router.get('/:id/emi-summary', requireAuth(), allowRoles(...LMS_ROLES), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const result = await emiService.getSummary(req.params.id as string);
        res.status(HTTP.OK).json({ success: true, data: result });
    } catch (err) { next(err); }
});

// GET /lms/loans/:id/payments
router.get('/:id/payments', requireAuth(), allowRoles(...LMS_ROLES), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const { page, limit } = req.query;
        const result = await paymentsService.listPayments({
            loanAccountId: req.params.id as string,
            page:  page  ? parseInt(page  as string, 10) : 1,
            limit: limit ? parseInt(limit as string, 10) : 20,
        });
        res.status(HTTP.OK).json(result);
    } catch (err) { next(err); }
});

// GET /lms/loans/:id/foreclosure-quote
router.get('/:id/foreclosure-quote', requireAuth(), allowRoles(...LMS_ROLES), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const account = await loansRepository.findAccountByIdOrThrow(req.params.id as string);
        const result = await emiService.getForeclosureQuote(req.params.id as string, account.interestRate);
        res.status(HTTP.OK).json({ success: true, data: result });
    } catch (err) { next(err); }
});

// GET /lms/loans/:id/mandate
router.get('/:id/mandate', requireAuth(), allowRoles(...LMS_ROLES), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const result = await paymentsService.getMandateForAccount(req.params.id as string);
        res.status(HTTP.OK).json({ success: true, data: result });
    } catch (err) { next(err); }
});

// GET /lms/loans/:id/cooling-off-quote
router.get('/:id/cooling-off-quote', requireAuth(), allowRoles(...LMS_ROLES), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const account = await loansRepository.findAccountByIdOrThrow(req.params.id as string);

        if (!account.disbursedAt) {
            throw new DomainError(
                'Loan has not been disbursed yet — cooling-off period not applicable',
                'NOT_DISBURSED',
            );
        }

        const now = new Date();
        const eligible = isWithinCoolingOffPeriod(account.disbursedAt, now, COOLING_OFF_PERIOD_DAYS);

        if (!eligible) {
            res.status(HTTP.OK).json({
                success: true,
                data: { eligible: false, coolingOffPeriodDays: COOLING_OFF_PERIOD_DAYS, disbursedAt: account.disbursedAt },
            });
            return;
        }

        const quote = computeCoolingOffPayoff({
            outstandingPrincipal: account.outstandingBalance,
            annualRatePct: account.interestRate,
            disbursedAt: account.disbursedAt,
            exitDate: now,
        });

        res.status(HTTP.OK).json({
            success: true,
            data: { eligible: true, coolingOffPeriodDays: COOLING_OFF_PERIOD_DAYS, disbursedAt: account.disbursedAt, ...quote },
        });
    } catch (err) { next(err); }
});

export { router as lmsLoansRouter };