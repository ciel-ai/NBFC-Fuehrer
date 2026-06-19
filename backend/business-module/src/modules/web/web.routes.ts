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

const router = Router();

router.use('/applications', applicationsRouter);
router.use('/credit', creditRouter);
router.use('/finance', financeRouter);

export { router as webRouter };