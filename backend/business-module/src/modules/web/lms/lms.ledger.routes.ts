// src/modules/web/lms/lms.ledger.routes.ts
import { Router } from 'express';
import type { Response, NextFunction } from 'express';
import { requireAuth, allowRoles } from '@/middlewares';
import { ROLE, HTTP } from '@/config/constants';
import type { AuthRequest } from '@/types/express';
import { accountingService } from '@/modules/accounting/accounting.service';

const router = Router();

const FINANCE_ROLES = [
    ROLE.SUPER_ADMIN, ROLE.ADMIN,
    ROLE.FINANCE,
];

// GET /lms/ledger/accounts — chart of accounts
router.get('/accounts', requireAuth(), allowRoles(...FINANCE_ROLES), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const result = await accountingService.getChartOfAccounts();
        res.status(HTTP.OK).json({ success: true, data: result });
    } catch (err) { next(err); }
});

// GET /lms/ledger/trial-balance?from=&to=
router.get('/trial-balance', requireAuth(), allowRoles(...FINANCE_ROLES), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const { from, to } = req.query;
        const result = await accountingService.getTrialBalance(
            from ? new Date(from as string) : undefined,
            to   ? new Date(to   as string) : undefined,
        );
        res.status(HTTP.OK).json({ success: true, data: result });
    } catch (err) { next(err); }
});

// GET /lms/ledger/entries?accountCode=&from=&to=&referenceType=&page=&limit=
router.get('/entries', requireAuth(), allowRoles(...FINANCE_ROLES), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const { accountCode, from, to, referenceType, page, limit } = req.query;
        const result = await accountingService.getLedger({
            accountCode:   accountCode   as string | undefined,
            fromDate:      from          ? new Date(from as string) : undefined,
            toDate:        to            ? new Date(to   as string) : undefined,
            referenceType: referenceType as any,
            page:          page  ? parseInt(page  as string, 10) : 1,
            limit:         limit ? parseInt(limit as string, 10) : 20,
        });
        res.status(HTTP.OK).json({ success: true, ...result });
    } catch (err) { next(err); }
});

// GET /lms/ledger/reference/:type/:id — entries for a specific transaction
router.get('/reference/:type/:id', requireAuth(), allowRoles(...FINANCE_ROLES), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const result = await accountingService.getEntriesByReference(
            req.params.type as string,
            req.params.id   as string,
        );
        res.status(HTTP.OK).json({ success: true, data: result });
    } catch (err) { next(err); }
});

export { router as lmsLedgerRouter };