// src/modules/web/lms/lms.routes.ts
import { Router } from 'express';
import { lmsLoansRouter }       from './lms.loans.routes';
import { lmsCollectionsRouter } from './lms.collections.routes';
import { lmsPaymentsRouter }    from './lms.payments.routes';
import { lmsReportsRouter }     from './lms.reports.routes';
import { lmsLedgerRouter }      from './lms.ledger.routes';
import { lmsReconciliationRouter } from './lms.reconciliation.routes';
import { lmsDocumentsRouter } from './lms.documents.routes';

const router = Router();

router.use('/loans',       lmsLoansRouter);
router.use('/collections', lmsCollectionsRouter);
router.use('/payments',    lmsPaymentsRouter);
router.use('/reports',     lmsReportsRouter);
router.use('/ledger',      lmsLedgerRouter);
router.use('/reconciliation', lmsReconciliationRouter);
router.use('/documents', lmsDocumentsRouter);



export { router as lmsRouter };