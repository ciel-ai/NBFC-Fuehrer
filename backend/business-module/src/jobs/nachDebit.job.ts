// src/jobs/nachDebit.job.ts
//
// Daily eNACH auto-debit collection. Finds EMIs due today with an active
// mandate, and initiates the debit via the payment provider. (This file
// previously contained an accidental duplicate of emiReminder.job.ts —
// no real auto-debit job existed until now.)

import cron from 'node-cron';
import { randomUUID } from 'crypto';
import { prisma } from '@/config/database';
import { paymentsService } from '@/modules/payments';
import { createModuleLogger } from '@/config/logger';
import { CRON_SCHEDULE, EMI_STATUS } from '@/config/constants';
import { toNumber } from '@/types/common.types';
import { acquireLock, releaseLock, RedisTTL } from '@/config/redis';

const log = createModuleLogger('job:nachDebit');

const JOB_LOCK_KEY = 'lock:cron:nach-debit';

export async function runNachDebitJob(): Promise<void> {
    const jobStart = Date.now();

    // Distributed lock for the entire job run — node-cron has no
    // built-in distributed awareness, so if this app is ever horizontally
    // scaled beyond one instance, every instance runs its own independent
    // scheduler on the same cron expression. Without this lock, two
    // instances firing the same schedule would each independently query
    // for "EMIs due today" and could both attempt to debit the same
    // customer for the same EMI.
    const lockToken = randomUUID();
    const lockAcquired = await acquireLock(JOB_LOCK_KEY, RedisTTL.CRON_JOB_LOCK, lockToken);

    if (!lockAcquired) {
        log.warn('NACH debit job skipped — another instance already holds the lock');
        return;
    }

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
                        // Cross-checked against the denormalized
                        // razorpay_mandate_id below — the two are supposed
                        // to stay in sync, but nothing enforced that until
                        // now, so this is the belt-and-suspenders check.
                        enach_mandates: {
                            where: { status: 'ACTIVE' },
                            select: { id: true, razorpay_mandate_id: true },
                        },
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

            const hasMatchingActiveMandate = account.enach_mandates?.some(
                (m) => m.razorpay_mandate_id === account.razorpay_mandate_id,
            );
            if (!hasMatchingActiveMandate) {
                log.warn('Debit skipped — mandate id on loan account has no matching ACTIVE mandate record', {
                    emiId: emi.id,
                    loanAccountId: account?.id,
                    razorpayMandateId: account.razorpay_mandate_id,
                });
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
    } finally {
        await releaseLock(JOB_LOCK_KEY, lockToken);
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