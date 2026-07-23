// src/jobs/reconciliation.job.ts
import cron from 'node-cron';
import { createModuleLogger } from '@/config/logger';
import { reconciliationService } from '@/modules/reconciliation/reconciliation.service';
import { CRON_SCHEDULE } from '@/config/constants';

const log = createModuleLogger('job:reconciliation');

export function scheduleReconciliationJob(): void {
    cron.schedule(CRON_SCHEDULE.RECONCILIATION, async () => {
        log.info('Reconciliation job started');
        try {
            await reconciliationService.runAll();
            log.info('Reconciliation job completed');
        } catch (err) {
            log.error('Reconciliation job failed', { error: err });
        }
    });

    log.info('Reconciliation job scheduled', { schedule: CRON_SCHEDULE.RECONCILIATION });
}

export async function runReconciliationJob(date?: Date): Promise<void> {
    log.info('Manual reconciliation triggered', { date });
    await reconciliationService.runAll(date ?? new Date());
    log.info('Manual reconciliation complete');
}