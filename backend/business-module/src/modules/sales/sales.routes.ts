// src/modules/sales/sales.routes.ts
//
// Every route here previously ran with no validation at all — the submit route
// took req.body straight into a service that ignored it. Validation is wired
// per route now, same validateAll/validateQuery/validateParams pattern the
// rest of the modules use.
//
// idempotency() on submit: this creates a real loan application and moves real
// money downstream. A retried request from a flaky shop connection must not
// produce two applications for the same customer. (The CDL service's own
// duplicate-application check catches the sequential case; idempotency closes
// the concurrent one.)

import { Router } from 'express';
import { salesController } from './sales.controller';
import { requireAuth, allowRoles, validateAll, validateParams, validateQuery } from '@/middlewares';
import { idempotency } from '@/middlewares/idempotency.middleware';
import { ROLE } from '@/config/constants';
import {
    salesProductParamSchema,
    salesCdlSubmitSchema,
    salesListQuerySchema,
    salesCustomerSearchSchema,
} from './sales.dto';

const router = Router();
const SALES = ROLE.AGENT; // Sales Person uses AGENT role until renamed

router.get('/fdo/:fdoCode', requireAuth(), allowRoles(SALES), salesController.lookupFdo);
router.get('/retail-shop/:shopCode', requireAuth(), allowRoles(SALES), salesController.lookupRetailShop);

router.get(
    '/customers/search',
    requireAuth(), allowRoles(SALES),
    validateQuery(salesCustomerSearchSchema),
    salesController.searchCustomer,
);

router.get(
    '/:product/dashboard/counts',
    requireAuth(), allowRoles(SALES),
    validateParams(salesProductParamSchema),
    salesController.getDashboardCounts,
);

router.get(
    '/:product/applications',
    requireAuth(), allowRoles(SALES),
    ...validateAll({ params: salesProductParamSchema, query: salesListQuerySchema }),
    salesController.listApplications,
);

router.post(
    '/:product/applications',
    requireAuth(), allowRoles(SALES),
    idempotency(),
    ...validateAll({ params: salesProductParamSchema, body: salesCdlSubmitSchema }),
    salesController.submitApplication,
);

export { router as salesRouter };
