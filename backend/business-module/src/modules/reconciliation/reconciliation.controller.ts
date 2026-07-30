// src/modules/reconciliation/reconciliation.controller.ts
import type { Response, NextFunction } from 'express';
import { reconciliationService } from './reconciliation.service';
import { HTTP } from '@/config/constants';
import { successResponse } from '@/types/common.types';
import { getValidatedQuery } from '@/types/express';
import type { AuthRequest } from '@/types/express';
import { NotFoundError } from '@/errors';

export const reconciliationController = {

    // GET /reconciliation/reports
    async listReports(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const query = getValidatedQuery<{
                reportType?: string;
                fromDate?:   string;
                toDate?:     string;
                page?:       number;
                limit?:      number;
            }>(req);

            const result = await reconciliationService.listReports({
                reportType: query.reportType,
                fromDate:   query.fromDate ? new Date(query.fromDate) : undefined,
                toDate:     query.toDate ? new Date(query.toDate) : undefined,
                page:       query.page ?? 1,
                limit:      query.limit ?? 20,
            });

            res.status(HTTP.OK).json(successResponse(result));
        } catch (err) { next(err); }
    },

    // GET /reconciliation/reports/:id
    async getReport(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const { id } = req.params;
            const report = await reconciliationService.getReport(id as string);

            if (!report) {
                throw new NotFoundError('Reconciliation report', id);
            }

            res.status(HTTP.OK).json(successResponse(report));
        } catch (err) { next(err); }
    },
};