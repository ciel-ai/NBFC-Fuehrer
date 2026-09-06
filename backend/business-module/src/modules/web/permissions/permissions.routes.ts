// src/modules/web/permissions/permissions.routes.ts
import { Router } from 'express';
import type { Response, NextFunction } from 'express';
import { requireAuth, allowRoles } from '@/middlewares';
import { ROLE, HTTP } from '@/config/constants';
import type { AuthRequest } from '@/types/express';
import type { Role } from '@/config/constants';
import { permissionsService, getRolePermissions } from '@/modules/admin/permissions.service';

const router = Router();

const ADMIN_ONLY = [ROLE.SUPER_ADMIN, ROLE.ADMIN];

const ALL_MODULES     = ['dashboard','applications','customers','appraisals','credit','finance','lms','collections','reports','agents','branches','users','approvals','permissions','audit','settings'];
const CREDIT_MODULES  = ['dashboard','applications','customers','appraisals','credit','approvals','reports'];
const FINANCE_MODULES = ['dashboard','applications','customers','finance','lms','reports'];

function defaultPermissions(role: Role): Record<string, string[]> {
    if (role === ROLE.SUPER_ADMIN || role === ROLE.ADMIN) {
        return Object.fromEntries(ALL_MODULES.map((m) => [m, ['READ', 'WRITE']]));
    }
    if (role.startsWith('CREDIT_')) {
        return Object.fromEntries(CREDIT_MODULES.map((m) => [m, ['READ', 'WRITE']]));
    }
    if (role.startsWith('FINANCE_')) {
        return Object.fromEntries(FINANCE_MODULES.map((m) => [m, ['READ', 'WRITE']]));
    }
    return {};
}

// GET /permissions/me — caller's own effective grants (not admin-gated)
router.get('/me', requireAuth(), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const role = req.user!.role as Role;
        let permissions: Record<string, string[]>;
        if (role === ROLE.SUPER_ADMIN || role === ROLE.ADMIN) {
            permissions = defaultPermissions(role);
        } else {
            const dbPerms = await getRolePermissions(role);
            permissions = Object.keys(dbPerms).length > 0 ? dbPerms : defaultPermissions(role);
        }
        res.status(HTTP.OK).json({ success: true, data: { role, permissions } });
    } catch (err) { next(err); }
});

// GET /permissions/roles — list all roles with their permissions
router.get('/roles', requireAuth(), allowRoles(...ADMIN_ONLY), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const result = await permissionsService.listRoles();
        res.status(HTTP.OK).json({ success: true, data: result });
    } catch (err) { next(err); }
});

// GET /permissions/roles/:roleName — get permissions for a specific role
router.get('/roles/:roleName', requireAuth(), allowRoles(...ADMIN_ONLY), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const result = await permissionsService.getRolePermissions(req.params.roleName as string);
        res.status(HTTP.OK).json({ success: true, data: result });
    } catch (err) { next(err); }
});

// POST /permissions/roles/:roleName/grant — grant a permission
router.post('/roles/:roleName/grant', requireAuth(), allowRoles(...ADMIN_ONLY), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const { module, action } = req.body;
        const result = await permissionsService.grantPermission(
            req.params.roleName as string,
            module,
            action ?? 'READ',
            req.user!.id,
        );
        res.status(HTTP.CREATED).json({ success: true, data: result });
    } catch (err) { next(err); }
});

// POST /permissions/roles/:roleName/revoke — revoke a permission
router.post('/roles/:roleName/revoke', requireAuth(), allowRoles(...ADMIN_ONLY), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const { module, action } = req.body;
        const result = await permissionsService.revokePermission(
            req.params.roleName as string,
            module,
            action ?? 'READ',
            req.user!.id,
        );
        res.status(HTTP.OK).json({ success: true, data: result });
    } catch (err) { next(err); }
});

// PATCH /permissions/roles/:roleName — update role label/description/status
router.patch('/roles/:roleName', requireAuth(), allowRoles(...ADMIN_ONLY), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const result = await permissionsService.updateRole(
            req.params.roleName as string,
            req.body,
        );
        res.status(HTTP.OK).json({ success: true, data: result });
    } catch (err) { next(err); }
});

export { router as permissionsRouter };