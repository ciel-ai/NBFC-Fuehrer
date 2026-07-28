// src/modules/web/appraisals/appraisals.routes.ts
import { Router } from 'express';
import type { Response, NextFunction } from 'express';
import { goldLoansService } from '@/modules/goldLoans/goldLoans.service';
import { housingLoansService } from '@/modules/housingLoans/housingLoans.service';
import { requireAuth, allowRoles } from '@/middlewares';
import { HTTP, ROLE } from '@/config/constants';
import type { AuthRequest } from '@/types/express';

const router = Router();

const OPS_ROLES = [ROLE.OPS_EXECUTIVE, ROLE.ADMIN, ROLE.SUPER_ADMIN];

// ─── Gold Loan appraisal ──────────────────────────────────────────────────────

// POST /appraisals/gold/:id/arrive
// Branch staff marks customer as arrived → transitions loan to APPRAISAL_PENDING
router.post('/gold/:id/arrive', requireAuth(), allowRoles(...OPS_ROLES), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const result = await goldLoansService.markArrived(req.params.id as string);
        res.status(HTTP.OK).json({ success: true, data: result });
    } catch (err) { next(err); }
});

// POST /appraisals/gold/:id
// Branch staff submits gold appraisal → writes to collateral_gold
// → transitions loan to PENDING_APPROVAL
// POST /appraisals/gold/:id
// Branch staff submits gold appraisal → writes to collateral_gold
// → transitions loan to PENDING_APPROVAL
router.post('/gold/:id', requireAuth(), allowRoles(...OPS_ROLES), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const {
            grossWeightGrams,
            stoneWeightGrams,
            impurityPct,
            purityKarat,
            ratePerGram,
            items,
        } = req.body;

        const result = await goldLoansService.submitAppraisal({
            loanId:           req.params.id as string,
            grossWeightGrams,
            stoneWeightGrams,
            impurityPct,
            purityKarat,
            ratePerGram,
            items:            items ?? {},
            valuedBy:         req.user!.id,
        });

        res.status(HTTP.OK).json({ success: true, data: result });
    } catch (err) { next(err); }
});

// GET /appraisals/gold/:id
// Get gold appraisal result for a loan application
router.get('/gold/:id', requireAuth(), allowRoles(...OPS_ROLES, ROLE.CREDIT_MANAGER), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const result = await goldLoansService.getAppraisalResult(req.params.id as string);
        res.status(HTTP.OK).json({ success: true, data: result });
    } catch (err) { next(err); }
});

// ─── Housing Loan property assessment ─────────────────────────────────────────

// POST /appraisals/housing/:id
// Ops staff submits property assessment → writes to collateral_property
// → transitions loan to PROPERTY_ASSESSMENT
router.post('/housing/:id', requireAuth(), allowRoles(...OPS_ROLES), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const {
            propertyType,
            address,
            estimatedMarketValue,
            propertyAge,
            legalClearance,
            builderName,
            constructionStage,
        } = req.body;

        const result = await housingLoansService.runPropertyAssessment({
            loanId:               req.params.id as string,
            propertyType,
            address,
            estimatedMarketValue,
            propertyAge,
            legalClearance,
            builderName,
            constructionStage,
            assessedBy:           req.user!.id,
        });

        res.status(HTTP.OK).json({ success: true, data: result });
    } catch (err) { next(err); }
});

// GET /appraisals/housing/:id
// Get property assessment result for a loan application
router.get('/housing/:id', requireAuth(), allowRoles(...OPS_ROLES, ROLE.CREDIT_MANAGER), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const { prisma } = await import('@/config/database');

        const collateral = await prisma.collateral_property.findUnique({
            where: { loan_id: req.params.id as string },
        });

        if (!collateral) {
            res.status(HTTP.NOT_FOUND).json({ error: 'Property assessment not found' });
            return;
        }

        res.status(HTTP.OK).json({
            success: true,
            data: {
                loanId:            collateral.loan_id,
                propertyType:      collateral.property_type,
                address:           collateral.address,
                marketValue:       Number(collateral.market_value),
                ltvPct:            Number(collateral.ltv_pct),
                builderName:       collateral.builder_name,
                constructionStage: collateral.construction_stage,
                valuedAt:          collateral.valued_at,
                createdAt:         collateral.created_at,
            },
        });
    } catch (err) { next(err); }
});

export { router as appraisalsWebRouter };