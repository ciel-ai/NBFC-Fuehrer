import { createApp } from './app';
import { env } from '@/config/env';
import { createModuleLogger } from '@/config/logger';
import { scheduleNpaWatchJob }       from '@/jobs/npaWatch.job';
import { scheduleReconciliationJob } from '@/jobs/reconciliation.job';
import { scheduleBureauReportingJob } from '@/jobs/bureauReporting.job';

const log = createModuleLogger('server');

const app = createApp();

const server = app.listen(env.port, () => {
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
    log.info('NPA watch job started and scheduled');
});

// ─── Graceful shutdown ────────────────────────────────────────────────────────
// Waits for in-flight requests to complete before shutting down.
// App Runner sends SIGTERM before stopping the container.

const SHUTDOWN_TIMEOUT_MS = 10_000;

function gracefulShutdown(signal: string): void {
    log.info(`${signal} received — starting graceful shutdown`);

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