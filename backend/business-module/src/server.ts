import { createApp } from './app';
import { env } from '@/config/env';
import { createModuleLogger } from '@/config/logger';
import { scheduleNpaWatchJob } from '@/jobs/npaWatch.job';

const log = createModuleLogger('server');

const app = createApp();

app.listen(env.port, () => {
    log.info(`Server running on port ${env.port}`, {
        env: env.nodeEnv,
        port: env.port,
    });

    // Daily DPD/NPA rollover — penalties, NPA marking, collection case
    // auto-open, broken PTP detection, overdue reminders. Runs at
    // CRON_SCHEDULE.NPA_WATCH (01:00 IST) per config/constants.ts.
    scheduleNpaWatchJob();
    log.info('NPA watch job started and scheduled');
});