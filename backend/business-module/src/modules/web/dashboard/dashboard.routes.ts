// src/modules/web/dashboard/dashboard.routes.ts
//
// Single-call dashboard summary for the web frontend's landing page.
// Reuses portfolioMISService (via reportsService.getPortfolioMIS) for
// KPIs + the 6-month disbursement/collection trend, and queries
// loan_applications directly for the weekly application trend, product
// distribution, approval ratio, pending actions, and recent feeds —
// none of which had an existing aggregation to reuse.

import { Router } from 'express';
import type { Response, NextFunction } from 'express';
import { reportsService } from '@/modules/reports/reports.service';
import { requireAuth, allowRoles } from '@/middlewares';
import { HTTP, LOAN_STATUS, ROLE } from '@/config/constants';
import type { AuthRequest } from '@/types/express';

const router = Router();

const DASHBOARD_ROLES = [
    ROLE.ADMIN, ROLE.SUPER_ADMIN,
    ROLE.CREDIT_CDL, ROLE.CREDIT_GOLD, ROLE.CREDIT_HOUSING, ROLE.CREDIT_MANAGER,
    ROLE.FINANCE_CDL, ROLE.FINANCE_GOLD, ROLE.FINANCE_HOUSING, ROLE.FINANCE,
];

// GET /dashboard/summary
router.get('/summary', requireAuth(), allowRoles(...DASHBOARD_ROLES), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const { prisma } = await import('@/config/database');
        const user = (req as any).user;

        const now = new Date();
        const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);
        const twelveWeeksAgo = new Date(now.getTime() - 12 * 7 * 24 * 60 * 60 * 1000);

        // ── 1. KPIs + 6-month trend — reuse the existing portfolio MIS report ──
        const portfolio = await reportsService.getPortfolioMIS(
            { fromDate: sixMonthsAgo, toDate: now, format: 'json' },
            user.role,
        );
        const report = portfolio.data as any; // PortfolioMISReport when format=json

        const kpis = {
            totalLoans: report.snapshot.totalLoans,
            activeLoans: report.snapshot.activeLoans,
            disbursedThisMonth: report.snapshot.disbursedThisMonth,
            closedThisMonth: report.snapshot.closedThisMonth,
            npaLoans: report.snapshot.npaLoans,
            totalDisbursed: report.snapshot.totalDisbursed,
            totalOutstanding: report.snapshot.totalOutstanding,
            totalOverdue: report.snapshot.totalOverdue,
            npaRate: report.snapshot.npaRate,
        };

        const disbursementTrend = report.monthlyTrend.map((m: any) => ({
            month: m.month,
            count: m.disbursements,
            amount: m.disbursedAmount,
        }));

        const collectionPerformance = report.monthlyTrend.map((m: any) => ({
            month: m.month,
            count: m.collections,
            amount: m.collectedAmount,
        }));

        // ── 2. Weekly application trend — last 12 weeks ─────────────────────
        const applicationTrendRows = await prisma.$queryRaw<Array<{
            week: string; count: bigint;
        }>>`
            WITH weeks AS (
                SELECT DATE_TRUNC('week', gs) AS week_start
                FROM generate_series(
                    DATE_TRUNC('week', ${twelveWeeksAgo}::date),
                    DATE_TRUNC('week', ${now}::date),
                    '1 week'
                ) gs
            )
            SELECT
                TO_CHAR(w.week_start, 'YYYY-MM-DD') AS week,
                COUNT(la.id) AS count
            FROM weeks w
            LEFT JOIN loan_applications la
                ON DATE_TRUNC('week', la.applied_at) = w.week_start
            GROUP BY w.week_start
            ORDER BY w.week_start;
        `;
        const applicationTrend = applicationTrendRows.map((r) => ({
            week: r.week,
            count: Number(r.count),
        }));

        // ── 3. Product type distribution ─────────────────────────────────────
        const typeDistributionRows = await prisma.loan_applications.groupBy({
            by: ['product_type'],
            _count: { id: true },
        });
        const typeDistribution = typeDistributionRows.map((r) => ({
            type: r.product_type,
            count: r._count.id,
        }));

        // ── 4. Approval ratio (all-time) ─────────────────────────────────────
        const [approvedCount, rejectedCount, totalDecided] = await Promise.all([
            prisma.loan_applications.count({ where: { status: LOAN_STATUS.APPROVED } }),
            prisma.loan_applications.count({ where: { status: LOAN_STATUS.REJECTED } }),
            prisma.loan_applications.count({
                where: { status: { in: [LOAN_STATUS.APPROVED, LOAN_STATUS.REJECTED] } },
            }),
        ]);
        const approvalRatio = {
            approved: approvedCount,
            rejected: rejectedCount,
            approvalRate: totalDecided > 0 ? Math.round((approvedCount / totalDecided) * 10000) / 100 : 0,
        };

        // ── 5. Pending actions — items waiting on this user's queue ─────────
        const pendingActions: Array<{ type: string; count: number; link: string }> = [];

        const pendingApproval = await prisma.loan_applications.count({
            where: { status: LOAN_STATUS.PENDING_APPROVAL },
        });
        if (pendingApproval > 0) {
            pendingActions.push({
                type: 'CREDIT_REVIEW',
                count: pendingApproval,
                link: '/credit/queue?tab=pending',
            });
        }

        const pendingDisbursement = await prisma.loan_applications.count({
            where: { status: LOAN_STATUS.APPROVED },
        });
        if (pendingDisbursement > 0) {
            pendingActions.push({
                type: 'FINANCE_DISBURSEMENT',
                count: pendingDisbursement,
                link: '/finance/queue?tab=pending',
            });
        }

        // ── 6. Recent applications (last 10) ─────────────────────────────────
        const recentApplications = await prisma.loan_applications.findMany({
            take: 10,
            orderBy: { applied_at: 'desc' },
            include: { user: { select: { full_name: true, phone: true } } },
        });

        // ── 7. Recent activities (last 10 audit log entries) ─────────────────
        const recentActivities = await prisma.audit_logs.findMany({
            take: 10,
            orderBy: { created_at: 'desc' },
        });

        res.status(HTTP.OK).json({
            kpis,
            applicationTrend,
            typeDistribution,
            approvalRatio,
            disbursementTrend,
            collectionPerformance,
            pendingActions,
            recentApplications,
            recentActivities,
        });
    } catch (err) { next(err); }
});

export { router as dashboardRouter };