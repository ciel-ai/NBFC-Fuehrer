// src/modules/web/settings/productConfig.routes.ts
import { Router } from 'express';
import type { Response, NextFunction } from 'express';
import { requireAuth, allowRoles } from '@/middlewares';
import { ROLE, HTTP } from '@/config/constants';
import type { AuthRequest } from '@/types/express';
import { productConfigService } from '@/modules/admin/productConfig.service';

const router = Router();

const ADMIN_ONLY   = [ROLE.SUPER_ADMIN, ROLE.ADMIN];
const FINANCE_READ = [ROLE.SUPER_ADMIN, ROLE.ADMIN, ROLE.FINANCE, ROLE.CREDIT_MANAGER];

// GET /settings/products — list all product configs
router.get('/', requireAuth(), allowRoles(...FINANCE_READ), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const result = await productConfigService.getAllProductConfigs();
        res.status(HTTP.OK).json({ success: true, data: result });
    } catch (err) { next(err); }
});

// GET /settings/products/:productType — single product config
router.get('/:productType', requireAuth(), allowRoles(...FINANCE_READ), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const result = await productConfigService.getProductConfig(req.params.productType as string);
        res.status(HTTP.OK).json({ success: true, data: result });
    } catch (err) { next(err); }
});

// PATCH /settings/products/:productType — update product config
router.patch('/:productType', requireAuth(), allowRoles(...ADMIN_ONLY), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const {
            minAmount, maxAmount, minRate, maxRate,
            maxTenureMonths, processingFeePct, insurancePct,
            stampDuty, documentationFee, maxLtvPct, isActive,
        } = req.body;

        const result = await productConfigService.updateProductConfig(
            req.params.productType as string,
            {
                minAmount, maxAmount, minRate, maxRate,
                maxTenureMonths, processingFeePct, insurancePct,
                stampDuty, documentationFee, maxLtvPct, isActive,
            },
        );

        res.status(HTTP.OK).json({ success: true, data: result });
    } catch (err) { next(err); }
});

export { router as productConfigRouter };