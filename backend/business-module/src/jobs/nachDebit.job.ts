// src/jobs/nachDebit.job.ts
//
// Daily eNACH auto-debit collection. Finds EMIs due today with an active
// mandate, and initiates the debit via the payment provider. (This file
// previously contained an accidental duplicate of emiReminder.job.ts —
// no real auto-debit job existed until now.)

import cron from 'node-cron';
import { prisma } from '@/config/database';
import { paymentsService } from '@/modules/payments';
import { createModuleLogger } from '@/config/logger';
import { CRON_SCHEDULE, EMI_STATUS } from '@/config/constants';
import { toNumber } from '@/types/common.types';

const log = createModuleLogger('job:nachDebit');

export async function runNachDebitJob(): Promise<void> {
    const jobStart = Date.now();
    log.info('NACH debit job started');

    let attempted = 0;
    let succeeded = 0;
    let failed = 0;

    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        // EMIs due today, not yet attempted
        const dueEmis = await prisma.emi_schedule.findMany({
            where: {
                status: EMI_STATUS.PENDING,
                due_date: { gte: today, lt: tomorrow },
            },
            include: {
                loan_account: {
                    select: {
                        id: true,
                        user_id: true,
                        razorpay_mandate_id: true,
                        status: true,
                    },
                },
            },
            take: 500,
        });

        log.info(`NACH debit: ${dueEmis.length} EMIs due today`);

        for (const emi of dueEmis) {
            const account = emi.loan_account;

            if (!account || !['ACTIVE', 'DISBURSED'].includes(account.status as string)) {
                continue;
            }

            if (!account.razorpay_mandate_id) {
                log.warn('Debit skipped — no active mandate', { emiId: emi.id, loanAccountId: account?.id });
                continue;
            }

            attempted++;

            try {
                const fakeReq = {
                    requestId: `job:nach:${emi.id}`,
                    requestLogger: log,
                    user: null,
                    auditContext: {},
                } as unknown as import('express').Request;

                await paymentsService.processNachDebit(
                    {
                        emiId: emi.id,
                        loanAccountId: account.id as string,
                        mandateId: account.razorpay_mandate_id as string,
                        amount: toNumber(emi.emi_amount as unknown as number),
                        penaltyAmount: toNumber(emi.penalty_amount as unknown as number),
                        description: `Auto-debit EMI #${emi.emi_number}`,
                    },
                    fakeReq,
                );

                succeeded++;
                log.info('NACH debit initiated', { emiId: emi.id, emiNumber: emi.emi_number, loanAccount: account.id });

            } catch (err) {
                failed++;
                log.error('NACH debit failed', { emiId: emi.id, error: (err as Error).message });
            }

            await sleep(150);
        }

        log.info('NACH debit job completed', {
            attempted, succeeded, failed,
            durationMs: Date.now() - jobStart,
        });

    } catch (err) {
        log.error('NACH debit job crashed', {
            error: (err as Error).message,
            stack: (err as Error).stack,
            durationMs: Date.now() - jobStart,
        });
    }
}

export function scheduleNachDebitJob(): cron.ScheduledTask {
    log.info('NACH debit job scheduled', { schedule: CRON_SCHEDULE.NACH_DEBIT });
    return cron.schedule(CRON_SCHEDULE.NACH_DEBIT, runNachDebitJob, {
        timezone: 'Asia/Kolkata',
    });
}

function sleep(ms: number): Promise<void> {
    return new Promise((r) => setTimeout(r, ms));
}