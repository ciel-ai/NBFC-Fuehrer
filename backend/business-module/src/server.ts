import { createApp } from './app';
import { env } from '@/config/env';
import { createModuleLogger } from '@/config/logger';
import { loadSecrets } from '@/config/secrets';
import { assertGlAccountCodesExist } from '@/modules/accounting/accounting.service';
import { scheduleNpaWatchJob }       from '@/jobs/npaWatch.job';
import { scheduleReconciliationJob } from '@/jobs/reconciliation.job';
import { scheduleBureauReportingJob } from '@/jobs/bureauReporting.job';
import { scheduleEmiReminderJob }    from '@/jobs/emiReminder.job';
import { scheduleNachDebitJob }      from '@/jobs/nachDebit.job';
import { scheduleDebitRetryJob }     from '@/jobs/debitRetry.job';
import { scheduleSettlementJob }     from '@/jobs/settlement.job';
import { scheduleMandateConsistencyCheckJob } from '@/jobs/mandateConsistencyCheck.job';
import { scheduleWebhookDeadLetterCheckJob } from '@/jobs/webhookDeadLetterCheck.job';
import { connectDatabase } from '@/config/database';
import { connectRedis } from '@/config/redis';
import { initCrashReporter, reportError } from '@/config/crashReporter';

const log = createModuleLogger('server');

let server: ReturnType<ReturnType<typeof createApp>['listen']>;

async function start(): Promise<void> {
    initCrashReporter();

    // Previously there was no handler for uncaughtException/unhandledRejection
    // at all — an unexpected error in a fire-and-forget async callback (e.g. a
    // .catch() that was never attached) would crash the process with only a
    // default Node.js stack trace on stdout, nothing captured, nothing
    // alerted. These are last-resort nets, not a substitute for fixing the
    // underlying bug — after reporting, the process still exits, since
    // continuing to run after a genuinely uncaught exception risks silent
    // data corruption.
    process.on('uncaughtException', (err) => {
        log.error('Uncaught exception — process will exit', {
            error: err instanceof Error ? err.message : String(err),
        });
        reportError(err, { source: 'uncaughtException' });
        process.exit(1);
    });

    process.on('unhandledRejection', (reason) => {
        log.error('Unhandled promise rejection — process will exit', {
            error: reason instanceof Error ? reason.message : String(reason),
        });
        reportError(reason, { source: 'unhandledRejection' });
        process.exit(1);
    });

    // Secrets must be loaded (or stubbed, in dev/test) BEFORE the server
    // starts accepting traffic. Previously this was never called at all —
    // the app would pass health checks and serve real requests, then fail
    // unpredictably per-request the first time anything touched a vendor
    // secret (SMS OTP, payments, KYC, email, credit bureau, webhook
    // signature verification). A secrets-unavailable condition must be a
    // boot failure, not a per-request surprise.
    try {
        await loadSecrets();
    } catch (err) {
        log.error('Fatal: failed to load secrets at startup — server will not start', {
            error: err instanceof Error ? err.message : String(err),
        });
        process.exit(1);
    }

    try {
        await connectDatabase();
    } catch (err) {
        log.error('Fatal: database connection failed at startup — server will not start', {
            error: err instanceof Error ? err.message : String(err),
        });
        process.exit(1);
    }

    try {
        await connectRedis();
    } catch (err) {
        log.error('Fatal: Redis connection failed at startup — server will not start', {
            error: err instanceof Error ? err.message : String(err),
        });
        process.exit(1);
    }

    try {
        await assertGlAccountCodesExist();
    } catch (err) {
        log.error('Fatal: GL account code validation failed at startup — server will not start', {
            error: err instanceof Error ? err.message : String(err),
        });
        process.exit(1);
    }

    const app = createApp();

    server = app.listen(env.port, () => {
        log.info(`Server running on port ${env.port}`, {
            env: env.nodeEnv,
            port: env.port,
        });

        // Daily DPD/NPA rollover — penalties, NPA marking, collection case
        // auto-open, broken PTP detection, overdue reminders. Runs at
        // CRON_SCHEDULE.NPA_WATCH (01:00 IST) per config/constants.ts.
        scheduleNpaWatchJob();
        scheduleReconciliationJob();
        scheduleBureauReportingJob();
        scheduleEmiReminderJob();
        scheduleNachDebitJob();
        scheduleDebitRetryJob();
        scheduleSettlementJob();
        scheduleMandateConsistencyCheckJob();
        scheduleWebhookDeadLetterCheckJob();
        log.info('All jobs started and scheduled');
    });
}

start();

// ─── Graceful shutdown ────────────────────────────────────────────────────────
// Waits for in-flight requests to complete before shutting down.
// App Runner sends SIGTERM before stopping the container.

const SHUTDOWN_TIMEOUT_MS = 10_000;

function gracefulShutdown(signal: string): void {
    log.info(`${signal} received — starting graceful shutdown`);

    if (!server) {
        log.warn('Shutdown signal received before server finished starting — exiting immediately');
        process.exit(0);
    }

    server.close(async () => {
        log.info('HTTP server closed — no new connections accepted');

        try {
            const { prisma } = await import('@/config/database');
            const { disconnectRedis } = await import('@/config/redis');
            await prisma.$disconnect();
            await disconnectRedis();
            log.info('Database and Redis connections closed');
        } catch (err) {
            log.error('Error during shutdown cleanup', { error: err });
        }

        log.info('Graceful shutdown complete');
        process.exit(0);
    });

    // Force exit if shutdown takes too long
    setTimeout(() => {
        log.error('Graceful shutdown timeout — forcing exit');
        process.exit(1);
    }, SHUTDOWN_TIMEOUT_MS);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT',  () => gracefulShutdown('SIGINT'));