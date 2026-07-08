// src/modules/web/lms/lms.routes.ts
import { Router } from 'express';
import { lmsLoansRouter }       from './lms.loans.routes';
import { lmsCollectionsRouter } from './lms.collections.routes';
import { lmsPaymentsRouter }    from './lms.payments.routes';
import { lmsReportsRouter }     from './lms.reports.routes';
import { lmsLedgerRouter }      from './lms.ledger.routes';

const router = Router();

router.use('/loans',       lmsLoansRouter);
router.use('/collections', lmsCollectionsRouter);
router.use('/payments',    lmsPaymentsRouter);
router.use('/reports',     lmsReportsRouter);
router.use('/ledger',      lmsLedgerRouter);

export { router as lmsRouter };