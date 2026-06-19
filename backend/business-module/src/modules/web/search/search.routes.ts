// src/modules/web/search/search.routes.ts
//
// Global search across applications and loan accounts, per frontend
// spec section 5.8. Searches by customer name/phone and surfaces the
// computed FHR-YYYY-XXXXX reference number (same formula as
// loansService's toApplicationResponse — not stored in DB, so search
// matches on name/phone/status, not the reference itself).

import { Router } from 'express';
import type { Response, NextFunction } from 'express';
import { requireAuth } from '@/middlewares';
import { HTTP } from '@/config/constants';
import type { AuthRequest } from '@/types/express';

const router = Router();

function buildReferenceNumber(appliedAt: Date, id: string): string {
    const year = new Date(appliedAt).getFullYear();
    const shortRef = id.replace(/-/g, '').slice(-5).toUpperCase();
    return `FHR-${year}-${shortRef}`;
}

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
                include: { user: { select: { full_name: true } } },
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
                appNumber: buildReferenceNumber(a.applied_at, a.id),
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