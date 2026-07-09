// src/modules/web/appraisals/goldCustody.routes.ts
import { Router } from 'express';
import type { Response, NextFunction } from 'express';
import { requireAuth, allowRoles } from '@/middlewares';
import { ROLE, HTTP } from '@/config/constants';
import type { AuthRequest } from '@/types/express';
import { goldCustodyService } from '@/modules/goldLoans/goldCustody.service';

const router = Router();

const OPS_ROLES     = [ROLE.SUPER_ADMIN, ROLE.ADMIN, ROLE.OPS_EXECUTIVE];
const FINANCE_ROLES = [ROLE.SUPER_ADMIN, ROLE.ADMIN, ROLE.FINANCE];
const READ_ROLES    = [ROLE.SUPER_ADMIN, ROLE.ADMIN, ROLE.OPS_EXECUTIVE, ROLE.FINANCE, ROLE.CREDIT_MANAGER];

// GET /appraisals/gold-custody?custodyStatus=&vaultLocation=&page=&limit=
router.get('/', requireAuth(), allowRoles(...READ_ROLES), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const { custodyStatus, vaultLocation, page, limit } = req.query;
        const result = await goldCustodyService.listCustody({
            custodyStatus: custodyStatus as any,
            vaultLocation: vaultLocation as string | undefined,
            page:          page  ? parseInt(page  as string, 10) : 1,
            limit:         limit ? parseInt(limit as string, 10) : 20,
        });
        res.status(HTTP.OK).json({ success: true, ...result });
    } catch (err) { next(err); }
});

// GET /appraisals/gold-custody/:loanId — custody detail for a loan
router.get('/:loanId', requireAuth(), allowRoles(...READ_ROLES), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const result = await goldCustodyService.getCustodyByLoanId(req.params.loanId as string);
        res.status(HTTP.OK).json({ success: true, data: result });
    } catch (err) { next(err); }
});

// PATCH /appraisals/gold-custody/:loanId/vault — set vault location after gold received
router.patch('/:loanId/vault', requireAuth(), allowRoles(...OPS_ROLES), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const result = await goldCustodyService.setVaultLocation(
            req.params.loanId as string,
            req.body.vaultLocation,
            req.user!.id,
        );
        res.status(HTTP.OK).json({ success: true, data: result });
    } catch (err) { next(err); }
});

// POST /appraisals/gold-custody/:loanId/release — release gold to customer
router.post('/:loanId/release', requireAuth(), allowRoles(...FINANCE_ROLES), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const result = await goldCustodyService.releaseGold({
            loanId:        req.params.loanId as string,
            releasedBy:    req.user!.id,
            releaseReason: req.body.releaseReason ?? 'LOAN_CLOSED',
            notes:         req.body.notes,
        });
        res.status(HTTP.OK).json({ success: true, data: result });
    } catch (err) { next(err); }
});

// POST /appraisals/gold-custody/:loanId/auction — mark gold as auctioned
router.post('/:loanId/auction', requireAuth(), allowRoles(...FINANCE_ROLES), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const result = await goldCustodyService.markAuctioned({
            loanId:      req.params.loanId as string,
            auctionedBy: req.user!.id,
            notes:       req.body.notes,
        });
        res.status(HTTP.OK).json({ success: true, data: result });
    } catch (err) { next(err); }
});

export { router as goldCustodyRouter };