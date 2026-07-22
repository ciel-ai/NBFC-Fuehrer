import { Router } from 'express';
import { requireAuth } from '@/middlewares';
import { HTTP } from '@/config/constants';
import { prisma } from '@/config/database';
import { getAuthUser } from '@/types/express';
import type { Response, NextFunction } from 'express';
import type { AuthRequest } from '@/types/express';

const router = Router();

// GET /notifications — real, paginated list of the caller's own notifications
router.get('/', requireAuth(), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const user = getAuthUser(req);
        const limit = 20;
        const cursor = typeof req.query.cursor === 'string' ? req.query.cursor : undefined;

        const rows = await prisma.in_app_notifications.findMany({
            where: { user_id: user.id },
            orderBy: { created_at: 'desc' },
            take: limit + 1,
            ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
        });

        const hasMore = rows.length > limit;
        const page = hasMore ? rows.slice(0, limit) : rows;

        res.status(HTTP.OK).json({
            success: true,
            data: {
                notifications: page.map((n) => ({
                    id: n.id,
                    title: n.title,
                    body: n.body,
                    templateKey: n.template_key,
                    read: n.read_at !== null,
                    createdAt: n.created_at,
                })),
                cursor: hasMore ? page[page.length - 1]!.id : null,
                hasMore,
            },
        });
    } catch (err) { next(err); }
});

// PATCH /notifications/:id/read — marks one notification read, scoped to the caller
router.patch('/:id/read', requireAuth(), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const user = getAuthUser(req);
        await prisma.in_app_notifications.updateMany({
            where: { id: req.params.id, user_id: user.id },
            data: { read_at: new Date() },
        });
        res.status(HTTP.OK).json({ success: true });
    } catch (err) { next(err); }
});

// POST /notifications/read-all — marks all of the caller's unread notifications read
router.post('/read-all', requireAuth(), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const user = getAuthUser(req);
        await prisma.in_app_notifications.updateMany({
            where: { user_id: user.id, read_at: null },
            data: { read_at: new Date() },
        });
        res.status(HTTP.OK).json({ success: true });
    } catch (err) { next(err); }
});

// GET /notifications/unread-count — real count, scoped to the caller
router.get('/unread-count', requireAuth(), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const user = getAuthUser(req);
        const count = await prisma.in_app_notifications.count({
            where: { user_id: user.id, read_at: null },
        });
        res.status(HTTP.OK).json({ success: true, data: { count } });
    } catch (err) { next(err); }
});

export { router as notificationsRouter };