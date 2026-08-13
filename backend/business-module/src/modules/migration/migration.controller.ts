// src/modules/migration/migration.controller.ts
import type { Response, NextFunction } from 'express';
import { migrationService } from './migration.service';
import { HTTP } from '@/config/constants';
import { successResponse } from '@/types/common.types';
import {
    getValidatedQuery,
    getValidatedParams,
} from '@/types/express';
import type { AuthRequest } from '@/types/express';
import type { ListBatchesInput } from './migration.types';

export const migrationController = {

    // GET /admin/migration/batches
    async listBatches(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const query = getValidatedQuery<ListBatchesInput>(req);
            const batches = await migrationService.listBatches(query);
            res.status(HTTP.OK).json(successResponse(batches));
        } catch (err) { next(err); }
    },

    // GET /admin/migration/batches/:batchId
    async getBatch(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const { batchId } = getValidatedParams<{ batchId: string }>(req);
            const batch = await migrationService.getBatch(batchId);
            res.status(HTTP.OK).json(successResponse(batch));
        } catch (err) { next(err); }
    },

    // GET /admin/migration/batches/:batchId/records
    async listRecords(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const { batchId } = getValidatedParams<{ batchId: string }>(req);
            const records = await migrationService.listRecords(batchId);
            res.status(HTTP.OK).json(successResponse(records));
        } catch (err) { next(err); }
    },
};