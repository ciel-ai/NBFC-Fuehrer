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

        const gatewaySettlement = {
            amount:  totalActual,
            isStub:  true,
            message: 'Razorpay credentials not yet active — running in stub mode',
        };

        const variance = totalActual - gatewaySettlement.amount;

        await prisma.reconciliation_reports.create({
            data: {
                run_date:        runDate,
                report_type:     'PAYMENT_GATEWAY',
                status:          gatewaySettlement.isStub ? 'STUB' : (variance === 0 ? 'MATCHED' : 'VARIANCE'),
                total_expected:  gatewaySettlement.amount,
                total_actual:    totalActual,
                variance:        Math.abs(variance),
                matched_count:   gatewayPayments.length,
                unmatched_count: 0,
                details:         { gatewaySettlement, paymentsCount: gatewayPayments.length },
                created_at:      new Date(),
            },
        });

        log.info('Payment gateway reconciliation complete', {
            totalActual,
            isStub: gatewaySettlement.isStub,
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