// src/modules/web/settings/settings.routes.ts
//
// Settings routes matching the web dashboard's expected shape
// (key/value, see src/types.ts). Wraps adminService's system_config
// CRUD — same table, same Redis cache, just frontend-shaped paths.

import { Router } from 'express';
import type { Response, NextFunction } from 'express';
import { adminService } from '@/modules/admin/admin.service';
import { requireAuth, allowRoles } from '@/middlewares';
import { HTTP, ROLE } from '@/config/constants';
import type { AuthRequest } from '@/types/express';
import type { ConfigKey } from '@/modules/admin/admin.types';

const router = Router();

const ADMIN_ONLY = [ROLE.ADMIN, ROLE.SUPER_ADMIN];

// GET /settings — all config key/value pairs
router.get('/', requireAuth(), allowRoles(...ADMIN_ONLY), async (_req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const result = await adminService.getAllConfigs();
        res.status(HTTP.OK).json(result);
    } catch (err) { next(err); }
});

// PUT /settings/:key  { value, reason }
router.put('/:key', requireAuth(), allowRoles(...ADMIN_ONLY), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const { key } = req.params;
        const { value } = req.body;
        const user = (req as any).user;

        const result = await adminService.updateConfig(
            { key: key as ConfigKey, value, updatedBy: user.id },
            req,
        );

        res.status(HTTP.OK).json(result);
    } catch (err) { next(err); }
});

export { router as settingsRouter };