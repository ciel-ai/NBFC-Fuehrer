// src/modules/sales/sales.controller.ts
//
// Every handler here was synchronous, took req.body/req.query unvalidated, and
// called a service that returned fixtures. They are async now because the
// service reads and writes the database, and they read validated input rather
// than raw request fields.

import type { Response, NextFunction } from 'express';
import type { AuthRequest } from '@/types/express';
import { getValidatedBody, getValidatedParams, getValidatedQuery } from '@/types/express';
import { HTTP } from '@/config/constants';
import { successResponse } from '@/types/common.types';
import { salesService } from './sales.service';
import type { SalesProduct, SalesApplicationStatus } from './sales.types';
import type { CdlApplicationInput } from '@/modules/cdlLoans/cdlLoans.types';

export const salesController = {

    async lookupFdo(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const fdoCode = req.params['fdoCode'] as string;
            const result = await salesService.lookupFdo(fdoCode);
            res.status(HTTP.OK).json(successResponse(result));
        } catch (err) { next(err); }
    },

    async lookupRetailShop(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const shopCode = req.params['shopCode'] as string;
            const result = await salesService.lookupRetailShop(shopCode);
            res.status(HTTP.OK).json(successResponse(result));
        } catch (err) { next(err); }
    },

    async searchCustomer(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const { q } = getValidatedQuery<{ q: string }>(req);
            const result = await salesService.searchCustomer(q);
            res.status(HTTP.OK).json(successResponse(result));
        } catch (err) { next(err); }
    },

    async getDashboardCounts(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const { product } = getValidatedParams<{ product: SalesProduct }>(req);
            const result = await salesService.getDashboardCounts(product, req.user!.id);
            res.status(HTTP.OK).json(successResponse(result));
        } catch (err) { next(err); }
    },

    async listApplications(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const { product } = getValidatedParams<{ product: SalesProduct }>(req);
            const { status, page, limit } = getValidatedQuery<{
                status?: SalesApplicationStatus; page: number; limit: number;
            }>(req);
            const result = await salesService.listApplications(
                product, status, req.user!.id, page, limit,
            );
            res.status(HTTP.OK).json(successResponse(result));
        } catch (err) { next(err); }
    },

    // The agent is taken from the JWT, never from the body — a sales user
    // cannot file an application as somebody else.
    async submitApplication(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const { product } = getValidatedParams<{ product: SalesProduct }>(req);
            const body = getValidatedBody<CdlApplicationInput & { customerId: string }>(req);
            const result = await salesService.submitApplication(product, body, req.user!.id);
            res.status(HTTP.CREATED).json(successResponse(result, 'Application submitted'));
        } catch (err) { next(err); }
    },
};
