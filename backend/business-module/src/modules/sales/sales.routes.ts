// src/modules/sales/sales.routes.ts
import { Router } from 'express';
import { salesController } from './sales.controller';
import { requireAuth, allowRoles } from '@/middlewares';
import { ROLE } from '@/config/constants';

const router = Router();
const SALES = ROLE.AGENT; // Sales Person uses AGENT role until renamed

router.get('/fdo/:fdoCode', requireAuth(), allowRoles(SALES), salesController.lookupFdo);
router.get('/retail-shop/:shopCode', requireAuth(), allowRoles(SALES), salesController.lookupRetailShop);
router.get('/customers/search', requireAuth(), allowRoles(SALES), salesController.searchCustomer);
router.get('/:product/dashboard/counts', requireAuth(), allowRoles(SALES), salesController.getDashboardCounts);
router.get('/:product/applications', requireAuth(), allowRoles(SALES), salesController.listApplications);
router.post('/:product/applications', requireAuth(), allowRoles(SALES), salesController.submitApplication);

export { router as salesRouter };