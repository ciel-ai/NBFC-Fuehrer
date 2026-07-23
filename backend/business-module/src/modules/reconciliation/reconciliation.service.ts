// src/modules/reconciliation/reconciliation.service.ts
import { prisma } from '@/config/database';
import { createModuleLogger } from '@/config/logger';

const log = createModuleLogger('reconciliation.service');

export const reconciliationService = {

    async runEmiReconciliation(runDate: Date = new Date()): Promise<void> {
        log.info('Starting EMI reconciliation', { runDate });

        const dateStr = runDate.toISOString().split('T')[0]!;

        const overdueEmis = await prisma.emi_schedule.findMany({
            where: {
                due_date: { lte: runDate },
                status:   { in: ['PENDING', 'OVERDUE'] },
            },
            include: {
                loan_account: {
                    select: { id: true, account_number: true, user_id: true },
                },
            },
        });

        const todayPayments = await prisma.payments.findMany({
            where: {
                channel: { in: ['NACH', 'RAZORPAY', 'UPI'] },
                created_at: {
                    gte: new Date(dateStr),
                    lt:  new Date(new Date(dateStr).getTime() + 24 * 60 * 60 * 1000),
                },
                status: 'SUCCESS',
            },
        });

        const totalExpected = overdueEmis.reduce((sum, e) => sum + Number(e.emi_amount), 0);
        const totalActual   = todayPayments.reduce((sum, p) => sum + Number(p.amount), 0);
        const variance      = totalActual - totalExpected;

        const unmatchedEmis = overdueEmis.filter(e =>
            !todayPayments.some(p => p.loan_account_id === e.loan_account_id),
        );

        // Previously only compared ONE portfolio-wide aggregate (total
        // expected vs total actual) — an account that underpays by ₹5,000
        // and an unrelated account that overpays by ₹5,000 on the same day
        // would net to a reported variance of exactly 0, silently masking
        // both real discrepancies. unmatchedEmis above already correctly
        // catches "paid nothing at all" at the per-account level, but the
        // genuinely missing case was "paid something, but not the right
        // amount." Added a per-account breakdown (only for accounts whose
        // own expected-vs-actual doesn't match, not an exhaustive dump of
        // every account) so a real per-account discrepancy is visible even
        // when the portfolio-level aggregate looks clean.
        const expectedByAccount = new Map<string, number>();
        for (const e of overdueEmis) {
            expectedByAccount.set(
                e.loan_account_id,
                (expectedByAccount.get(e.loan_account_id) ?? 0) + Number(e.emi_amount),
            );
        }
        const actualByAccount = new Map<string, number>();
        for (const p of todayPayments) {
            actualByAccount.set(
                p.loan_account_id,
                (actualByAccount.get(p.loan_account_id) ?? 0) + Number(p.amount),
            );
        }
        const allAccountIds = new Set([...expectedByAccount.keys(), ...actualByAccount.keys()]);
        const accountDiscrepancies = Array.from(allAccountIds)
            .map((accountId) => {
                const accountExpected = expectedByAccount.get(accountId) ?? 0;
                const accountActual = actualByAccount.get(accountId) ?? 0;
                return {
                    loanAccountId: accountId,
                    expected: accountExpected,
                    actual: accountActual,
                    difference: accountActual - accountExpected,
                };
            })
            .filter((row) => row.difference !== 0);

        const details = {
            overdueEmiCount: overdueEmis.length,
            paymentsToday:   todayPayments.length,
            unmatchedEmis:   unmatchedEmis.map(e => ({
                emiId:         e.id,
                loanAccountId: e.loan_account_id,
                accountNumber: e.loan_account?.account_number,
                dueDate:       e.due_date,
                amount:        Number(e.emi_amount),
            })),
            accountDiscrepancies,
        };

        await prisma.reconciliation_reports.create({
            data: {
                run_date:        runDate,
                report_type:     'EMI_COLLECTION',
                status:          variance === 0 ? 'MATCHED' : 'VARIANCE',
                total_expected:  totalExpected,
                total_actual:    totalActual,
                variance:        Math.abs(variance),
                matched_count:   todayPayments.length,
                unmatched_count: unmatchedEmis.length,
                details,
                created_at:      new Date(),
            },
        });

        log.info('EMI reconciliation complete', {
            totalExpected,
            totalActual,
            variance,
            unmatchedCount: unmatchedEmis.length,
        });
    },

    async runPaymentGatewayReconciliation(runDate: Date = new Date()): Promise<void> {
        log.info('Starting payment gateway reconciliation', { runDate });

        const dateStr = runDate.toISOString().split('T')[0]!;

        const gatewayPayments = await prisma.payments.findMany({
            where: {
                channel: { in: ['NACH', 'RAZORPAY', 'UPI'] },
                created_at: {
                    gte: new Date(dateStr),
                    lt:  new Date(new Date(dateStr).getTime() + 24 * 60 * 60 * 1000),
                },
                status: 'SUCCESS',
            },
        });

        const totalActual = gatewayPayments.reduce((sum, p) => sum + Number(p.amount), 0);

        // Blocked on a confirmed external dependency: real Razorpay
        // settlement-report access isn't available yet (Razorpay account
        // activation is a pending client blocker, tracked separately).
        // Previously this set gatewaySettlement.amount equal to totalActual
        // by construction, then computed variance = totalActual -
        // gatewaySettlement.amount, which is mathematically guaranteed to
        // be 0 regardless of any real discrepancy — comparing a number to
        // itself, not to an actual external source of truth. total_expected
        // and variance are now genuinely absent (null) in stub mode, rather
        // than a fabricated zero that could be misread as a real, checked
        // "MATCHED" result by anything downstream reading the numeric
        // fields without also checking status.
        const isStub = true; // Flip once real Razorpay settlement access is available
        const message = 'Razorpay credentials not yet active — no real settlement data available to compare against';

        await prisma.reconciliation_reports.create({
            data: {
                run_date:        runDate,
                report_type:     'PAYMENT_GATEWAY',
                status:          'STUB',
                total_expected:  null,
                total_actual:    totalActual,
                variance:        null,
                matched_count:   0,
                unmatched_count: 0,
                details:         { isStub, message, paymentsCount: gatewayPayments.length },
                created_at:      new Date(),
            },
        });

        log.warn('Payment gateway reconciliation ran in STUB mode — no real comparison was performed', {
            totalActual,
            message,
        });
    },

    async listReports(filters: {
        reportType?: string;
        fromDate?:   Date;
        toDate?:     Date;
        page:        number;
        limit:       number;
    }) {
        const where: any = {};

        if (filters.reportType) where.report_type = filters.reportType;
        if (filters.fromDate || filters.toDate) {
            where.run_date = {
                ...(filters.fromDate ? { gte: filters.fromDate } : {}),
                ...(filters.toDate   ? { lte: filters.toDate   } : {}),
            };
        }

        const skip = (filters.page - 1) * filters.limit;

        const [rows, total] = await prisma.$transaction([
            prisma.reconciliation_reports.findMany({
                where,
                orderBy: { run_date: 'desc' },
                skip,
                take: filters.limit,
            }),
            prisma.reconciliation_reports.count({ where }),
        ]);

        return { data: rows, total };
    },

    async getReport(id: string) {
        return prisma.reconciliation_reports.findUnique({ where: { id } });
    },

    async runAll(runDate: Date = new Date()): Promise<void> {
        await Promise.allSettled([
            this.runEmiReconciliation(runDate),
            this.runPaymentGatewayReconciliation(runDate),
        ]);
    },
};