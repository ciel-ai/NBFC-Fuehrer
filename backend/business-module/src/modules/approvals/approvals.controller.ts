// src/modules/approvals/approvals.controller.ts
import type { Response, NextFunction } from 'express';
import { approvalsService } from './approvals.service';
import { HTTP } from '@/config/constants';
import { successResponse } from '@/types/common.types';
import { getAuthUser, getValidatedQuery, getValidatedBody } from '@/types/express';
import type { AuthRequest } from '@/types/express';

export const approvalsController = {

    // GET /approvals
    async list(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const query = getValidatedQuery<{ status?: string }>(req);
            const result = await approvalsService.list(query.status);
            res.status(HTTP.OK).json(successResponse(result));
        } catch (err) { next(err); }
    },

    // POST /approvals/:id/approve
    async approve(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const user = getAuthUser(req);
            const { id } = req.params;
            const body = getValidatedBody<{ remarks?: string }>(req);
            const result = await approvalsService.approve(id as string, user.id, user.role, body.remarks);
            res.status(HTTP.OK).json(successResponse(result, 'Approved'));
        } catch (err) { next(err); }
    },

    // POST /approvals/:id/reject
    async reject(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const user = getAuthUser(req);
            const { id } = req.params;
            const body = getValidatedBody<{ remarks: string }>(req);
            const result = await approvalsService.reject(id as string, user.id, user.role, body.remarks);
            res.status(HTTP.OK).json(successResponse(result, 'Rejected'));
        } catch (err) { next(err); }
    },
};