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
        const query = getValidatedQuery<{
            productType?: string;
            status?: string;
            search?: string;
            page: number;
            limit: number;
        }>(req);
        const result = await adminService.listAllLoans(query);
        res.status(HTTP.OK).json(successResponse(result));
    } catch (err) { next(err); }
},

// GET /admin/loans/:loanId
    // GET /admin/loans/:loanId
async getLoanDetail(req: AuthRequest, res: Response, next: NextFunction) {
    try {
        const loanId = req.params.loanId as string;
        const result = await adminService.getLoanDetail(loanId);
        res.status(HTTP.OK).json(successResponse(result));
    } catch (err) { next(err); }
},

// PATCH /admin/customers/:userId/status
async setCustomerActiveStatus(req: AuthRequest, res: Response, next: NextFunction) {
    try {
        const userId = req.params.userId as string;
        const { isActive } = req.body as { isActive: boolean };
        await adminService.setCustomerActiveStatus(userId, isActive);
        res.status(HTTP.OK).json(successResponse({ userId, isActive }));
    } catch (err) { next(err); }
},

};

