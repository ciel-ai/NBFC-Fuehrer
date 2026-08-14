// src/modules/migration/migration.service.ts
import { migrationRepository } from './migration.repository';
import { createModuleLogger } from '@/config/logger';
import type {
    MigrationBatch,
    MigrationRecord,
    ListBatchesInput,
    RunBatchConfig,
    BatchResult,
} from './migration.types';
const log = createModuleLogger('migration.service');

export const migrationService = {

    async runBatch<T>(config: RunBatchConfig<T>): Promise<BatchResult> {
        const batch = await migrationRepository.createBatch({
            batchName: config.batchName,
            entityType: config.entityType,
            sourceSystem: config.sourceSystem,
            triggeredBy: config.triggeredBy,
            notes: config.notes,
        });

        await migrationRepository.setTotalRecords(batch.id, config.items.length);

        let successCount = 0;
        let failureCount = 0;

        for (const item of config.items) {
            const legacyId = config.getLegacyId(item);

            const existing = await migrationRepository.findRecord(
                batch.id,
                config.entityType,
                legacyId,
            );
            if (existing) {
                log.info('Skipping already-migrated record', { legacyId, batchId: batch.id });
                continue;
            }

            try {
                const result = await config.process(item, batch.id);
                await migrationRepository.createRecord({
                    batchId: batch.id,
                    entityType: config.entityType,
                    legacyId,
                    newRecordId: result.newRecordId,
                    status: 'SUCCESS',
                });
                await migrationRepository.incrementSuccess(batch.id);
                successCount++;
            } catch (err) {
                const errorMessage = err instanceof Error ? err.message : String(err);
                log.error('Record migration failed', { legacyId, batchId: batch.id, error: errorMessage });
                await migrationRepository.createRecord({
                    batchId: batch.id,
                    entityType: config.entityType,
                    legacyId,
                    status: 'FAILED',
                    errorMessage,
                });
                await migrationRepository.incrementFailure(batch.id);
                failureCount++;
            }
        }

        if (failureCount === 0) {
            await migrationRepository.completeBatch(batch.id);
        } else {
            await migrationRepository.failBatch(batch.id);
        }

        log.info('Batch finished', { batchId: batch.id, successCount, failureCount });

        return {
            batchId: batch.id,
            totalRecords: config.items.length,
            successCount,
            failureCount,
        };
    },

    async getBatch(batchId: string): Promise<MigrationBatch> {
        return migrationRepository.findBatchByIdOrThrow(batchId);
    },

    async listBatches(input: ListBatchesInput): Promise<MigrationBatch[]> {
        return migrationRepository.listBatches(input);
    },

        async listRecords(batchId: string): Promise<MigrationRecord[]> {
        await migrationRepository.findBatchByIdOrThrow(batchId);
        return migrationRepository.listRecordsByBatch(batchId);
    },
};