// src/modules/sales/sales.controller.ts
import type { Response, NextFunction } from 'express';
import type { AuthRequest } from '@/types/express';
import { HTTP } from '@/config/constants';
import { successResponse } from '@/types/common.types';
import { salesService } from './sales.service';
import type { SalesProduct, SalesApplicationStatus } from './sales.types';

export const salesController = {

    lookupFdo(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const fdoCode = req.params['fdoCode'] as string;
            const result = salesService.lookupFdo(fdoCode);
            res.status(HTTP.OK).json(successResponse(result));
        } catch (err) { next(err); }
    },

    lookupRetailShop(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const shopCode = req.params['shopCode'] as string;
            const result = salesService.lookupRetailShop(shopCode);
            res.status(HTTP.OK).json(successResponse(result));
        } catch (err) { next(err); }
    },

    searchCustomer(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const query = (req.query['q'] as string) ?? '';
            const result = salesService.searchCustomer(query);
            res.status(HTTP.OK).json(successResponse(result));
        } catch (err) { next(err); }
    },

    getDashboardCounts(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const product = req.params['product'] as SalesProduct;
            const result = salesService.getDashboardCounts(product);
            res.status(HTTP.OK).json(successResponse(result));
        } catch (err) { next(err); }
    },

    listApplications(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const product = req.params['product'] as SalesProduct;
            const status = (req.query['status'] as SalesApplicationStatus) ?? 'SUBMITTED';
            const result = salesService.listApplications(product, status);
            res.status(HTTP.OK).json(successResponse(result));
        } catch (err) { next(err); }
    },

    submitApplication(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const product = req.params['product'] as SalesProduct;
            const result = salesService.submitApplication(product, req.body);
            res.status(HTTP.CREATED).json(successResponse(result, 'Application submitted'));
        } catch (err) { next(err); }
    },
};