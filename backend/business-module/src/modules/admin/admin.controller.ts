// src/modules/admin/admin.controller.ts
import type { Response, NextFunction } from 'express';
import { adminService } from './admin.service';
import { HTTP } from '@/config/constants';
import {
    successResponse,
    paginatedResponse,
} from '@/types/common.types';
import {
    getValidatedBody,
    getValidatedParams,
    getValidatedQuery,
    getAuthUser,
} from '@/types/express';
import type { AuthRequest } from '@/types/express';
import type {
    CreateAdminUserInput,
    UpdateAdminUserInput,
    UpdateSystemConfigInput,
    ListAdminUsersInput,
    ConfigKey,
} from './admin.types';

export const adminController = {

    // GET /admin/dashboard
    async dashboard(_req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const result = await adminService.getDashboard();
            res.status(HTTP.OK).json(successResponse(result));
        } catch (err) { next(err); }
    },

    // GET /admin/users
    async listUsers(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const query = getValidatedQuery<ListAdminUsersInput>(req);
            const result = await adminService.listAdminUsers(query);
            res.status(HTTP.OK).json(paginatedResponse(result));
        } catch (err) { next(err); }
    },

    // GET /admin/users/:userId
    async getUser(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const { userId } = getValidatedParams<{ userId: string }>(req);
            const result = await adminService.getAdminUser(userId);
            res.status(HTTP.OK).json(successResponse(result));
        } catch (err) { next(err); }
    },

    // POST /admin/users
    async createUser(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const body = getValidatedBody<CreateAdminUserInput>(req);
            const result = await adminService.createAdminUser(body, req);
            res.status(HTTP.CREATED).json(
                successResponse(result, 'Admin user created'),
            );
        } catch (err) { next(err); }
    },

    // PATCH /admin/users/:userId
    async updateUser(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const user = getAuthUser(req);
            const { userId } = getValidatedParams<{ userId: string }>(req);
            const body = getValidatedBody<UpdateAdminUserInput>(req);
            const result = await adminService.updateAdminUser(
                userId, body, user.id, req,
            );
            res.status(HTTP.OK).json(successResponse(result, 'User updated'));
        } catch (err) { next(err); }
    },

    // GET /admin/config
    async listConfigs(_req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const result = await adminService.getAllConfigs();
            res.status(HTTP.OK).json(successResponse(result));
        } catch (err) { next(err); }
    },

    // GET /admin/config/:key
    async getConfig(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const { key } = getValidatedParams<{ key: ConfigKey }>(req);
            const result = await adminService.getConfig(key);
            res.status(HTTP.OK).json(successResponse(result));
        } catch (err) { next(err); }
    },

    // PUT /admin/config/:key
    async updateConfig(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const user = getAuthUser(req);
            const { key } = getValidatedParams<{ key: ConfigKey }>(req);
            const body = getValidatedBody<{ value: string; reason: string }>(req);

            const input: UpdateSystemConfigInput = {
                key,
                value: body.value,
                updatedBy: user.id,
            };

            const result = await adminService.updateConfig(input, req);
            res.status(HTTP.OK).json(successResponse(result, 'Configuration updated'));
        } catch (err) { next(err); }
    },

    // POST /admin/maintenance
    async setMaintenance(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const user = getAuthUser(req);
            const body = getValidatedBody<{
                enabled: boolean;
                message: string;
            }>(req);

            await adminService.setMaintenanceMode(
                body.enabled,
                body.message,
                user.id,
                req,
            );

            res.status(HTTP.OK).json(
                successResponse(
                    null,
                    body.enabled
                        ? 'Maintenance mode enabled'
                        : 'Maintenance mode disabled',
                ),
            );
        } catch (err) { next(err); }
    },
<<<<<<< HEAD

    // GET /admin/branches
async listBranches(_req: AuthRequest, res: Response, next: NextFunction) {
    try {
        const result = await adminService.listBranches();
        res.status(HTTP.OK).json(successResponse(result));
    } catch (err) { next(err); }
},

// POST /admin/branches
async createBranch(req: AuthRequest, res: Response, next: NextFunction) {
    try {
        const body = getValidatedBody<any>(req);
        const result = await adminService.createBranch(body, req);
        res.status(HTTP.CREATED).json(successResponse(result, 'Branch created'));
    } catch (err) { next(err); }
},

// PATCH /admin/branches/:branchId
async updateBranch(req: AuthRequest, res: Response, next: NextFunction) {
    try {
        const { branchId } = getValidatedParams<{ branchId: string }>(req);
        const body = getValidatedBody<any>(req);
        const result = await adminService.updateBranch(branchId, body, req);
        res.status(HTTP.OK).json(successResponse(result, 'Branch updated'));
    } catch (err) { next(err); }
},

// GET /admin/loans
async listAllLoans(req: AuthRequest, res: Response, next: NextFunction) {
    try {
        const result = await adminService.listAllLoans(req.query);
        res.status(HTTP.OK).json(successResponse(result));
    } catch (err) { next(err); }
},

// GET /admin/loans/:loanId
async getLoanDetail(req: AuthRequest, res: Response, next: NextFunction) {
    try {
        const loanId = req.params.loanId as string;
        const result = await adminService.getLoanDetail(loanId);
        res.status(HTTP.OK).json(successResponse(result));
    } catch (err) { next(err); }
},

// POST /admin/auth/login
    async login(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const { email, password } = req.body as { email: string; password: string };
            const bcrypt = await import('bcryptjs');
            const jwt = await import('jsonwebtoken');
            const { prisma } = await import('@/config/database');
            const { env } = await import('@/config/env');

            const user = await prisma.admin_users.findUnique({
                where: { email },
            });

            if (!user || !user.password_hash) {
                res.status(HTTP.UNAUTHORIZED).json({ success: false, message: 'Invalid email or password' });
                return;
            }

            if (user.is_active === false) {
                res.status(HTTP.UNAUTHORIZED).json({ success: false, message: 'Account is deactivated. Contact administrator.' });
                return;
            }

            const valid = await bcrypt.compare(password, user.password_hash);
            if (!valid) {
                res.status(HTTP.UNAUTHORIZED).json({ success: false, message: 'Invalid email or password' });
                return;
            }

            // Update last login
            await prisma.admin_users.update({
                where: { id: user.id },
                data: { last_login_at: new Date(), updated_at: new Date() },
            });

            const token = jwt.sign(
                {
                    id:       user.id,
                    role:     user.role,
                    email:    user.email,
                    branchId: user.branch_id,
                },
                env.auth.jwtSecret,
                { expiresIn: '12h' },
            );

            res.status(HTTP.OK).json({
                success: true,
                data: {
                    token,
                    user: {
                        id:       user.id,
                        fullName: user.full_name,
                        email:    user.email,
                        phone:    user.phone,
                        role:     user.role,
                        branchId: user.branch_id,
                    },
                },
            });
        } catch (err) { next(err); }
    },

    // GET /admin/auth/me
    async me(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const user = getAuthUser(req);
            const { prisma } = await import('@/config/database');

            const adminUser = await prisma.admin_users.findUnique({
                where: { id: user.id },
                select: {
                    id:        true,
                    full_name: true,
                    email:     true,
                    phone:     true,
                    role:      true,
                    branch_id: true,
                    is_active: true,
                },
            });

            if (!adminUser || !adminUser.is_active) {
                res.status(HTTP.UNAUTHORIZED).json({ success: false, message: 'Account not found or deactivated' });
                return;
            }

            res.status(HTTP.OK).json({
                success: true,
                data: {
                    id:       adminUser.id,
                    fullName: adminUser.full_name,
                    email:    adminUser.email,
                    phone:    adminUser.phone,
                    role:     adminUser.role,
                    branchId: adminUser.branch_id,
                },
            });
        } catch (err) { next(err); }
    },
};


=======
};
>>>>>>> origin/main
