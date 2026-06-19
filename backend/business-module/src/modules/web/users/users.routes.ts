// src/modules/web/users/users.routes.ts
//
// User management routes matching the web dashboard's expected shape
// (name, phone, email, role, branchId, status — see src/types.ts).
// Wraps adminService — same admin_users table, same staff auth, just
// field names and paths matching the frontend contract.

import { Router } from 'express';
import type { Response, NextFunction } from 'express';
import { adminService } from '@/modules/admin/admin.service';
import { requireAuth, allowRoles } from '@/middlewares';
import { HTTP, ROLE } from '@/config/constants';
import type { AuthRequest } from '@/types/express';

const router = Router();

const ADMIN_ONLY = [ROLE.ADMIN, ROLE.SUPER_ADMIN];

// GET /users?role=&status=&search=
router.get('/', requireAuth(), allowRoles(...ADMIN_ONLY), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const { role, status, search, page, limit } = req.query;
        const result = await adminService.listAdminUsers({
            role: role as any,
            status: status as any,
            search: search as string,
            page: page ? parseInt(page as string, 10) : 1,
            limit: limit ? parseInt(limit as string, 10) : 20,
        });

        // Reshape camelCase fields → frontend's flat {name, ...} shape
        const data = result.data.map((u: any) => ({
            id: u.id,
            name: u.fullName,
            email: u.email,
            phone: u.phone,
            role: u.role,
            status: u.status,
            branchId: u.branchId ?? null,
            lastLoginAt: u.lastLoginAt,
            createdAt: u.createdAt,
        }));

        res.status(HTTP.OK).json({
            data,
            meta: {
                page: result.pagination?.page ?? 1,
                pageSize: result.pagination?.limit ?? 20,
                total: result.pagination?.total ?? 0,
            },
        });
    } catch (err) { next(err); }
});

// POST /users {name, phone, email, role, branchId, status}
router.post('/', requireAuth(), allowRoles(...ADMIN_ONLY), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const { name, phone, email, role, branchId } = req.body;
        const result = await adminService.createAdminUser({
            fullName: name,
            phone,
            email,
            role,
            branchId,
            department: req.body.department ?? 'General',
            username: req.body.username,
            password: req.body.password,
            product: req.body.product,
        }, req);

        res.status(HTTP.CREATED).json({
            id: result.id,
            name: result.fullName,
            email: result.email,
            phone: result.phone,
            role: result.role,
            status: result.status,
        });
    } catch (err) { next(err); }
});

// PATCH /users/:id
router.patch('/:id', requireAuth(), allowRoles(...ADMIN_ONLY), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;
        const user = (req as any).user;
        const { name, ...rest } = req.body;
        const result = await adminService.updateAdminUser(
            id as string,
            { fullName: name, ...rest },
            user.id,
            req,
        );
        res.status(HTTP.OK).json({
            id: result.id,
            name: result.fullName,
            email: result.email,
            phone: result.phone,
            role: result.role,
            status: result.status,
        });
    } catch (err) { next(err); }
});

// POST /users/:id/activate
router.post('/:id/activate', requireAuth(), allowRoles(...ADMIN_ONLY), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;
        const user = (req as any).user;
        const result = await adminService.updateAdminUser(id as string, { status: 'ACTIVE' }, user.id, req);
        res.status(HTTP.OK).json({ id: result.id, status: result.status });
    } catch (err) { next(err); }
});

// POST /users/:id/deactivate
router.post('/:id/deactivate', requireAuth(), allowRoles(...ADMIN_ONLY), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;
        const user = (req as any).user;
        const result = await adminService.updateAdminUser(id as string, { status: 'INACTIVE' }, user.id, req);
        res.status(HTTP.OK).json({ id: result.id, status: result.status });
    } catch (err) { next(err); }
});

export { router as usersRouter };