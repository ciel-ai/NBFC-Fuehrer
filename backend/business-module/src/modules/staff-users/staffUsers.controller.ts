// src/modules/staff-users/staffUsers.controller.ts
import type { Request, Response, NextFunction } from 'express';
import { successResponse, paginatedResponse } from '@/utils/apiResponse.util';
import { getValidatedBody, getValidatedQuery, getValidatedParams } from '@/types/express';
import { getStaffUser } from '@/middlewares/verifyStaffToken.middleware';
import type { StaffRole } from '@/constants/staffRoles.constants';
import * as service from './staffUsers.service';

function actorOf(req: Request): service.Actor {
    const staff = getStaffUser(req);
    return { id: staff.id, role: staff.role, requestId: req.requestId };
}

export const staffUsersController = {
    async list(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const q = getValidatedQuery<{ role?: StaffRole; status?: string; search?: string; page: number; limit: number }>(req);
            const result = await service.listUsers(q);
            res.status(200).json(paginatedResponse(result));
        } catch (err) { next(err); }
    },

    async create(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const body = getValidatedBody<{ name: string; phone: string; email: string; role: StaffRole; branchId?: string; status?: string }>(req);
            const result = await service.createUser(body, actorOf(req));
            res.status(201).json(successResponse(result, 'Staff user created'));
        } catch (err) { next(err); }
    },

    async update(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { id } = getValidatedParams<{ id: string }>(req);
            const body = getValidatedBody<{ name?: string; phone?: string; email?: string; role?: StaffRole; branchId?: string | null; status?: string }>(req);
            const user = await service.updateUser(id, body, actorOf(req));
            res.status(200).json(successResponse(user, 'Staff user updated'));
        } catch (err) { next(err); }
    },

    async activate(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { id } = getValidatedParams<{ id: string }>(req);
            const user = await service.setStatus(id, 'ACTIVE', actorOf(req));
            res.status(200).json(successResponse(user, 'Staff user activated'));
        } catch (err) { next(err); }
    },

    async deactivate(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { id } = getValidatedParams<{ id: string }>(req);
            const user = await service.setStatus(id, 'INACTIVE', actorOf(req));
            res.status(200).json(successResponse(user, 'Staff user deactivated'));
        } catch (err) { next(err); }
    },

    async resetPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { id } = getValidatedParams<{ id: string }>(req);
            const result = await service.resetPassword(id, actorOf(req));
            res.status(200).json(successResponse(result, 'Password reset'));
        } catch (err) { next(err); }
    },

    async listBranches(_req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const branches = await service.listBranches();
            res.status(200).json(successResponse(branches));
        } catch (err) { next(err); }
    },
};
