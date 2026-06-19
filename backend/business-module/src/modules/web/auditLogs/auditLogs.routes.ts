// src/modules/web/auditLogs/auditLogs.routes.ts
//
// Audit log route matching the web dashboard's expected path
// (/audit-logs, see frontend spec section 5.8). Wraps auditService.list
// — same audit_logs table, same compliance role check, just a
// frontend-shaped path (existing canonical path is /api/v1/audit).

import { Router } from 'express';
import type { Response, NextFunction } from 'express';
import { auditService } from '@/modules/audit/audit.service';
import { requireAuth } from '@/middlewares';
import { HTTP } from '@/config/constants';
import type { AuthRequest } from '@/types/express';

const router = Router();

// GET /audit-logs?module=&role=&user=&from=&to=&search=
router.get('/', requireAuth(), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const user = (req as any).user;
        const { module, user: filterUserId, from, to, page, limit } = req.query;

        const result = await auditService.list({
            entityType: module as string | undefined,
            userId: filterUserId as string | undefined,
            fromDate: from ? new Date(from as string) : undefined,
            toDate: to ? new Date(to as string) : undefined,
            page: page ? parseInt(page as string, 10) : 1,
            limit: limit ? parseInt(limit as string, 10) : 50,
        }, user.role);

        res.status(HTTP.OK).json({
            data: result.data,
            meta: {
                page: result.pagination?.page ?? 1,
                pageSize: result.pagination?.limit ?? 50,
                total: result.pagination?.total ?? 0,
            },
        });
    } catch (err) { next(err); }
});

export { router as auditLogsRouter };