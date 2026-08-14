// src/modules/migration/migration.routes.ts
import { Router } from 'express';
import { migrationController } from './migration.controller';
import {
    requireAuth,
    allowRoles,
    validateQuery,
    validateParams,
} from '@/middlewares';
import { listBatchesQuerySchema, batchIdParamSchema } from './migration.dto';
import { ROLE } from '@/config/constants';

const router = Router();

router.get(
    '/batches',
    requireAuth(),
    allowRoles(ROLE.SUPER_ADMIN),
    validateQuery(listBatchesQuerySchema),
    migrationController.listBatches,
);

router.get(
    '/batches/:batchId',
    requireAuth(),
    allowRoles(ROLE.SUPER_ADMIN),
    validateParams(batchIdParamSchema),
    migrationController.getBatch,
);

router.get(
    '/batches/:batchId/records',
    requireAuth(),
    allowRoles(ROLE.SUPER_ADMIN),
    validateParams(batchIdParamSchema),
    migrationController.listRecords,
);

export { router as migrationRouter };