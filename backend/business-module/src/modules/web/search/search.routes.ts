// src/modules/web/search/search.routes.ts
//
// Global search across applications and loan accounts, per frontend
// spec section 5.8. Searches by customer name/phone and returns the
// real, stored reference_number. Status search matches on exact enum
// value (case-insensitive) since status is now a true Postgres enum,
// not a free-text field — partial/substring matching is no longer
// possible at the DB level.

import { Router } from 'express';
import type { Response, NextFunction } from 'express';
import { requireAuth, allowRoles } from '@/middlewares';
import { ROLE } from '@/constants/roles.constants';
import { HTTP, LOAN_STATUS } from '@/config/constants';
import type { AuthRequest } from '@/types/express';

const router = Router();

const VALID_LOAN_STATUSES = new Set<string>(Object.values(LOAN_STATUS));

// GET /search?q=
router.get('/', requireAuth(), allowRoles(ROLE.OPS_EXECUTIVE, ROLE.CREDIT_MANAGER, ROLE.ADMIN, ROLE.SUPER_ADMIN), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const { prisma } = await import('@/config/database');
        const q = (req.query.q as string)?.trim();

        if (!q || q.length < 2) {
            return res.status(HTTP.OK).json({ applications: [], loans: [] });
        }

        // Status is now a real enum — only usable as an exact-match filter,
        // and only if the search term is actually a valid status value.
        const qUpper = q.toUpperCase();
        const statusMatch = VALID_LOAN_STATUSES.has(qUpper) ? qUpper : null;

        const [applications, loanAccounts] = await Promise.all([
            prisma.loan_applications.findMany({
                where: {
                    OR: [
                        { user: { full_name: { contains: q, mode: 'insensitive' } } },
                        { user: { phone: { contains: q } } },
                        ...(statusMatch ? [{ status: statusMatch as any }] : []),
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
                        ...(statusMatch ? [{ status: statusMatch as any }] : []),
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