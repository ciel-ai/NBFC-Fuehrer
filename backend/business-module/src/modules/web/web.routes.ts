// src/modules/web/web.routes.ts
//
// Single entry point for all web-dashboard-facing routes.
// Mounted once in app.ts at the API base path. Each sub-router wraps
// existing services from loans/, admin/, kyc/, etc. — no business logic
// duplicated here, just route shaping for the frontend contract.

import { Router } from 'express';
import { applicationsRouter }   from './applications/applications.routes';
import { creditRouter }         from './credit/credit.routes';
import { financeRouter }        from './finance/finance.routes';
import { usersRouter }          from './users/users.routes';
import { dashboardRouter }      from './dashboard/dashboard.routes';
import { settingsRouter }       from './settings/settings.routes';
import { auditLogsRouter }      from './auditLogs/auditLogs.routes';
import { searchRouter }         from './search/search.routes';
import { agentsWebRouter }      from './agents/agents.routes';
import { customersWebRouter }   from './customers/customers.routes';
import { collectionsWebRouter } from './collections/collections.routes';
import { reportsWebRouter }     from './reports/reports.routes';
import { branchesWebRouter }    from './branches/branches.routes';
import { appraisalsWebRouter }  from './appraisals/appraisals.routes';
import { lmsRouter }            from './lms/lms.routes';

const router = Router();

router.use('/applications',  applicationsRouter);
router.use('/credit',        creditRouter);
router.use('/finance',       financeRouter);
router.use('/users',         usersRouter);
router.use('/dashboard',     dashboardRouter);
router.use('/settings',      settingsRouter);
router.use('/audit-logs',    auditLogsRouter);
router.use('/search',        searchRouter);
router.use('/agents',        agentsWebRouter);
router.use('/customers',     customersWebRouter);
router.use('/collections',   collectionsWebRouter);
router.use('/reports',       reportsWebRouter);
router.use('/branches',      branchesWebRouter);
router.use('/appraisals',    appraisalsWebRouter);
router.use('/lms',           lmsRouter);

export { router as webRouter };