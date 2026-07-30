// src/jobs/mandateConsistencyCheck.job.ts
//
// Daily safety-net cron. The debit crons (nachDebit.job.ts, debitRetry.job.ts)
// and _handleMandateCancelled already guard against loan_accounts.razorpay_
// mandate_id drifting out of sync with the true ACTIVE mandate in
// enach_mandates (roadmap 1.3) — this job doesn't prevent drift, it catches
// it if it ever happens anyway (a manual DB edit, a bug we haven't found
// yet, a migration mistake), and surfaces it as an alert rather than letting
// it sit silently until a debit attempt fails against it.

import cron from 'node-cron';
import { randomUUID } from 'crypto';
import { prisma } from '@/config/database';
import { createModuleLogger } from '@/config/logger';
import { CRON_SCHEDULE } from '@/config/constants';
import { acquireLock, releaseLock, RedisTTL } from '@/config/redis';
import { reportError } from '@/config/crashReporter';

const log = createModuleLogger('job:mandateConsistencyCheck');

const JOB_LOCK_KEY = 'lock:cron:mandate-consistency-check';

export async function runMandateConsistencyCheckJob(): Promise<void> {
    const jobStart = Date.now();

    const lockToken = randomUUID();
    const lockAcquired = await acquireLock(JOB_LOCK_KEY, RedisTTL.CRON_JOB_LOCK, lockToken);

    if (!lockAcquired) {
        log.warn('Mandate consistency check skipped — another instance already holds the lock');
        return;
    }

    log.info('Mandate consistency check started');

    try {
        // Case 1: loan account has a mandate id, but no ACTIVE mandate
        // record matches it (dead/mismatched reference — see 1.3).
        const accountsWithMandateId = await prisma.loan_accounts.findMany({
            where: { razorpay_mandate_id: { not: null } },
            select: {
                id: true,
                account_number: true,
                razorpay_mandate_id: true,
                enach_mandates: {
                    where: { status: 'ACTIVE' },
                    select: { id: true, razorpay_mandate_id: true },
                },
            },
        });

        const orphanedMandateIds = accountsWithMandateId.filter(
            (a) => !a.enach_mandates.some((m) => m.razorpay_mandate_id === a.razorpay_mandate_id),
        );

        // Case 2: an ACTIVE mandate exists for a loan account, but the
        // account's denormalized razorpay_mandate_id doesn't point at it
        // (the debit crons would silently miss this account entirely).
        const activeMandatesMissingFromAccount = await prisma.enach_mandates.findMany({
            where: {
                status: 'ACTIVE',
                loan_account_id: { not: null },
            },
            select: {
                id: true,
                razorpay_mandate_id: true,
                loan_account_id: true,
                loan_account: { select: { razorpay_mandate_id: true } },
            },
        });

        const unreferencedActiveMandates = activeMandatesMissingFromAccount.filter(
            (m) => m.loan_account?.razorpay_mandate_id !== m.razorpay_mandate_id,
        );

        const totalIssues = orphanedMandateIds.length + unreferencedActiveMandates.length;

        if (totalIssues > 0) {
            reportError(
                new Error('Mandate/loan_account consistency check found drift'),
                {
                    orphanedMandateIds: orphanedMandateIds.map((a) => ({
                        loanAccountId: a.id,
                        accountNumber: a.account_number,
                        razorpayMandateId: a.razorpay_mandate_id,
                    })),
                    unreferencedActiveMandates: unreferencedActiveMandates.map((m) => ({
                        mandateId: m.id,
                        loanAccountId: m.loan_account_id,
                        razorpayMandateId: m.razorpay_mandate_id,
                    })),
                },
            );
        }

        log.info('Mandate consistency check completed', {
            accountsChecked: accountsWithMandateId.length,
            activeMandatesChecked: activeMandatesMissingFromAccount.length,
            issuesFound: totalIssues,
            durationMs: Date.now() - jobStart,
        });

    } catch (err) {
        log.error('Mandate consistency check crashed', {
            error: (err as Error).message,
            stack: (err as Error).stack,
            durationMs: Date.now() - jobStart,
        });
    } finally {
        await releaseLock(JOB_LOCK_KEY, lockToken);
    }
}

export function scheduleMandateConsistencyCheckJob(): cron.ScheduledTask {
    log.info('Mandate consistency check job scheduled', { schedule: CRON_SCHEDULE.MANDATE_CONSISTENCY_CHECK });
    return cron.schedule(CRON_SCHEDULE.MANDATE_CONSISTENCY_CHECK, runMandateConsistencyCheckJob, {
        timezone: 'Asia/Kolkata',
    });
}