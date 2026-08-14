// src/modules/migration/migration.repository.ts
import { prisma } from '@/config/database';
import { createModuleLogger } from '@/config/logger';
import { NotFoundError } from '@/errors';
import type {
    MigrationBatch,
    MigrationRecord,
    CreateBatchInput,
    CreateRecordInput,
    ListBatchesInput,
} from './migration.types';

const log = createModuleLogger('migration.repository');

// ─── Type mappers ──────────────────────────────────────────────────────────────

function mapBatch(row: Record<string, unknown>): MigrationBatch {
    return {
        id: row.id as string,
        batchName: row.batch_name as string,
        entityType: row.entity_type as MigrationBatch['entityType'],
        sourceSystem: row.source_system as string,
        status: row.status as MigrationBatch['status'],
        totalRecords: row.total_records as number,
        successCount: row.success_count as number,
        failureCount: row.failure_count as number,
        startedAt: row.started_at as Date,
        completedAt: row.completed_at as Date | null,
        triggeredBy: row.triggered_by as string,
        notes: row.notes as string | null,
    };
}

function mapRecord(row: Record<string, unknown>): MigrationRecord {
    return {
        id: row.id as string,
        batchId: row.batch_id as string,
        entityType: row.entity_type as MigrationRecord['entityType'],
        legacyId: row.legacy_id as string,
        newRecordId: row.new_record_id as string | null,
        status: row.status as MigrationRecord['status'],
        errorMessage: row.error_message as string | null,
        createdAt: row.created_at as Date,
    };
}

// ─── Repository ────────────────────────────────────────────────────────────────

export const migrationRepository = {

    // ── Batch operations ───────────────────────────────────────────────────────

    async createBatch(input: CreateBatchInput): Promise<MigrationBatch> {
        const row = await prisma.migration_batches.create({
            data: {
                batch_name: input.batchName,
                entity_type: input.entityType,
                source_system: input.sourceSystem,
                triggered_by: input.triggeredBy,
                notes: input.notes ?? null,
                status: 'RUNNING',
                total_records: 0,
                success_count: 0,
                failure_count: 0,
            },
        });
        log.info('Migration batch created', { batchId: row.id, entityType: input.entityType });
        return mapBatch(row as unknown as Record<string, unknown>);
    },

    async findBatchById(id: string): Promise<MigrationBatch | null> {
        const row = await prisma.migration_batches.findUnique({ where: { id } });
        return row ? mapBatch(row as unknown as Record<string, unknown>) : null;
    },

    async findBatchByIdOrThrow(id: string): Promise<MigrationBatch> {
        const batch = await this.findBatchById(id);
        if (!batch) throw new NotFoundError('MigrationBatch', id);
        return batch;
    },

    async listBatches(input: ListBatchesInput): Promise<MigrationBatch[]> {
        const where: Record<string, unknown> = {};
        if (input.entityType) where.entity_type = input.entityType;
        if (input.status) where.status = input.status;

        const rows = await prisma.migration_batches.findMany({
            where,
            orderBy: { started_at: 'desc' },
            take: input.limit ?? 50,
            skip: input.offset ?? 0,
        });
        return rows.map((r) => mapBatch(r as unknown as Record<string, unknown>));
    },

    async setTotalRecords(id: string, totalRecords: number): Promise<void> {
        await prisma.migration_batches.update({
            where: { id },
            data: { total_records: totalRecords },
        });
    },

    async incrementSuccess(id: string): Promise<void> {
        await prisma.migration_batches.update({
            where: { id },
            data: { success_count: { increment: 1 } },
        });
    },

    async incrementFailure(id: string): Promise<void> {
        await prisma.migration_batches.update({
            where: { id },
            data: { failure_count: { increment: 1 } },
        });
    },

    async completeBatch(id: string): Promise<void> {
        await prisma.migration_batches.update({
            where: { id },
            data: { status: 'COMPLETED', completed_at: new Date() },
        });
        log.info('Migration batch completed', { batchId: id });
    },

    async failBatch(id: string): Promise<void> {
        await prisma.migration_batches.update({
            where: { id },
            data: { status: 'FAILED', completed_at: new Date() },
        });
        log.warn('Migration batch failed', { batchId: id });
    },

    async rollbackBatch(id: string): Promise<void> {
        await prisma.migration_batches.update({
            where: { id },
            data: { status: 'ROLLED_BACK', completed_at: new Date() },
        });
        log.warn('Migration batch rolled back', { batchId: id });
    },

    // ── Record operations ──────────────────────────────────────────────────────

    async createRecord(input: CreateRecordInput): Promise<MigrationRecord> {
        const row = await prisma.migration_records.create({
            data: {
                batch_id: input.batchId,
                entity_type: input.entityType,
                legacy_id: input.legacyId,
                new_record_id: input.newRecordId ?? null,
                status: input.status,
                error_message: input.errorMessage ?? null,
            },
        });
        return mapRecord(row as unknown as Record<string, unknown>);
    },

    async findRecord(
        batchId: string,
        entityType: string,
        legacyId: string,
    ): Promise<MigrationRecord | null> {
        const row = await prisma.migration_records.findUnique({
            where: {
                batch_id_entity_type_legacy_id: { batch_id: batchId, entity_type: entityType, legacy_id: legacyId },
            },
        });
        return row ? mapRecord(row as unknown as Record<string, unknown>) : null;
    },

    async listRecordsByBatch(batchId: string): Promise<MigrationRecord[]> {
        const rows = await prisma.migration_records.findMany({
            where: { batch_id: batchId },
            orderBy: { created_at: 'asc' },
        });
        return rows.map((r) => mapRecord(r as unknown as Record<string, unknown>));
    },
};