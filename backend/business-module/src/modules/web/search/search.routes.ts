// src/modules/web/search/search.routes.ts
//
// Global search across applications and loan accounts, per frontend
// spec section 5.8. Searches by customer name/phone and returns the
// real, stored reference_number (atomic sequence, same value shown on
// KFS/application detail/everywhere else) — no longer computed locally.

import { Router } from 'express';
import type { Response, NextFunction } from 'express';
import { requireAuth } from '@/middlewares';
import { HTTP } from '@/config/constants';
import type { AuthRequest } from '@/types/express';

const router = Router();

// GET /search?q=
router.get('/', requireAuth(), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const { prisma } = await import('@/config/database');
        const q = (req.query.q as string)?.trim();

        if (!q || q.length < 2) {
            return res.status(HTTP.OK).json({ applications: [], loans: [] });
        }

        const [applications, loanAccounts] = await Promise.all([
            prisma.loan_applications.findMany({
                where: {
                    OR: [
                        { user: { full_name: { contains: q, mode: 'insensitive' } } },
                        { user: { phone: { contains: q } } },
                        { status: { contains: q.toUpperCase() } },
                    ],
                },
                take: 8,
                orderBy: { applied_at: 'desc' },
                select: {
                    id: true,
                    reference_number: true,
                    status: true,
                    user: { select: { full_name: true } },
                },
            }),
            prisma.loan_accounts.findMany({
                where: {
                    OR: [
                        { account_number: { contains: q } },
                        { status: { contains: q.toUpperCase() } },
                    ],
                },
                take: 8,
                orderBy: { disbursed_at: 'desc' },
            }),
        ]);

        res.status(HTTP.OK).json({
            applications: applications.map((a) => ({
                id: a.id,
                appNumber: a.reference_number,
                customerName: a.user?.full_name ?? null,
                status: a.status,
            })),
            loans: loanAccounts.map((l) => ({
                id: l.id,
                loanNumber: l.account_number,
                status: l.status,
            })),
        });
    } catch (err) { next(err); }
});

export { router as searchRouter };