// src/modules/web/web.routes.ts
//
// Single entry point for all web-dashboard-facing routes.
// Mounted once in app.ts at the API base path. Each sub-router wraps
// existing services from loans/, admin/, kyc/, etc. — no business logic
// duplicated here, just route shaping for the frontend contract
// (src/types.ts, src/store/appStore.ts, src/auth/rbac.ts).

import { Router } from 'express';
import { applicationsRouter } from './applications/applications.routes';
import { creditRouter } from './credit/credit.routes';
import { financeRouter } from './finance/finance.routes';
import { usersRouter } from './users/users.routes';
import { adminService } from '@/modules/admin/admin.service';
import { requireAuth, allowRoles } from '@/middlewares';
import { ROLE, HTTP } from '@/config/constants';
import { dashboardRouter } from './dashboard/dashboard.routes';
import { settingsRouter } from './settings/settings.routes';
import { auditLogsRouter } from './auditLogs/auditLogs.routes';
import { searchRouter } from './search/search.routes';

const router = Router();

router.use('/applications', applicationsRouter);
router.use('/credit', creditRouter);
router.use('/finance', financeRouter);
router.use('/users', usersRouter);
router.use('/dashboard', dashboardRouter);
router.use('/settings', settingsRouter);
router.use('/audit-logs', auditLogsRouter);
router.use('/search', searchRouter);

// GET /branches — top-level per frontend spec
router.get('/branches', requireAuth(), allowRoles(ROLE.ADMIN, ROLE.SUPER_ADMIN), async (_req, res, next) => {
    try {
        const result = await adminService.listBranches();
        res.status(HTTP.OK).json(result);
    } catch (err) { next(err); }
});

export { router as webRouter };