// src/jobs/reconciliation.job.ts
import cron from 'node-cron';
import { createModuleLogger } from '@/config/logger';
import { reconciliationService } from '@/modules/reconciliation/reconciliation.service';

const log = createModuleLogger('job:reconciliation');

export function scheduleReconciliationJob(): void {
    cron.schedule('0 2 * * *', async () => {
        log.info('Reconciliation job started');
        try {
            await reconciliationService.runAll();
            log.info('Reconciliation job completed');
        } catch (err) {
            log.error('Reconciliation job failed', { error: err });
        }
    });

    log.info('Reconciliation job scheduled', { schedule: '0 2 * * *' });
}

export async function runReconciliationJob(date?: Date): Promise<void> {
    log.info('Manual reconciliation triggered', { date });
    await reconciliationService.runAll(date ?? new Date());
    log.info('Manual reconciliation complete');
}