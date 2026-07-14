// src/modules/web/appraisals/goldAuction.routes.ts
import { Router } from 'express';
import type { Response, NextFunction } from 'express';
import { requireAuth, allowRoles } from '@/middlewares';
import { ROLE, HTTP } from '@/config/constants';
import type { AuthRequest } from '@/types/express';
import { goldAuctionService } from '@/modules/goldLoans/goldAuction.service';

const router = Router();

const FINANCE_ROLES = [ROLE.SUPER_ADMIN, ROLE.ADMIN, ROLE.FINANCE];
const READ_ROLES    = [ROLE.SUPER_ADMIN, ROLE.ADMIN, ROLE.FINANCE, ROLE.CREDIT_MANAGER, ROLE.COLLECTION_AGENT];

// GET /appraisals/gold-auction?status=&page=&limit=
router.get('/', requireAuth(), allowRoles(...READ_ROLES), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const { status, page, limit } = req.query;
        const result = await goldAuctionService.listAuctions({
            status: status as any,
            page:   page  ? parseInt(page  as string, 10) : 1,
            limit:  limit ? parseInt(limit as string, 10) : 20,
        });
        res.status(HTTP.OK).json({ success: true, ...result });
    } catch (err) { next(err); }
});

// GET /appraisals/gold-auction/loan/:loanAccountId
router.get('/loan/:loanAccountId', requireAuth(), allowRoles(...READ_ROLES), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const result = await goldAuctionService.getByLoanAccount(req.params.loanAccountId as string);
        res.status(HTTP.OK).json({ success: true, data: result });
    } catch (err) { next(err); }
});

// POST /appraisals/gold-auction/initiate
router.post('/initiate', requireAuth(), allowRoles(...FINANCE_ROLES), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const result = await goldAuctionService.initiateAuction({
            loanAccountId:     req.body.loanAccountId,
            loanApplicationId: req.body.loanApplicationId,
            auctionType:       req.body.auctionType ?? 'PUBLIC',
            noticePeriodDays:  req.body.noticePeriodDays ?? 14,
            outstandingDues:   req.body.outstandingDues,
            initiatedBy:       req.user!.id,
            notes:             req.body.notes,
        });
        res.status(HTTP.CREATED).json({ success: true, data: result });
    } catch (err) { next(err); }
});

// PATCH /appraisals/gold-auction/:id/schedule
router.patch('/:id/schedule', requireAuth(), allowRoles(...FINANCE_ROLES), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const result = await goldAuctionService.scheduleAuction({
            auctionId:     req.params.id as string,
            scheduledDate: new Date(req.body.scheduledDate),
            reservePrice:  req.body.reservePrice,
            scheduledBy:   req.user!.id,
        });
        res.status(HTTP.OK).json({ success: true, data: result });
    } catch (err) { next(err); }
});

// PATCH /appraisals/gold-auction/:id/complete
router.patch('/:id/complete', requireAuth(), allowRoles(...FINANCE_ROLES), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const result = await goldAuctionService.completeAuction({
            auctionId:       req.params.id as string,
            actualSalePrice: req.body.actualSalePrice,
            completedBy:     req.user!.id,
            notes:           req.body.notes,
        });
        res.status(HTTP.OK).json({ success: true, data: result });
    } catch (err) { next(err); }
});

// PATCH /appraisals/gold-auction/:id/cancel
router.patch('/:id/cancel', requireAuth(), allowRoles(...FINANCE_ROLES), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const result = await goldAuctionService.cancelAuction({
            auctionId:   req.params.id as string,
            cancelledBy: req.user!.id,
            reason:      req.body.reason ?? 'Cancelled',
        });
        res.status(HTTP.OK).json({ success: true, data: result });
    } catch (err) { next(err); }
});

export { router as goldAuctionRouter };