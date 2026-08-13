// src/modules/migration/migration.types.ts

export type MigrationEntityType =
    | 'CUSTOMER'
    | 'LOAN'
    | 'EMI_SCHEDULE'
    | 'PAYMENT'
    | 'MANDATE';

export type MigrationBatchStatus =
    | 'RUNNING'
    | 'COMPLETED'
    | 'FAILED'
    | 'ROLLED_BACK';

export type MigrationRecordStatus = 'SUCCESS' | 'FAILED' | 'SKIPPED';

// ─── Domain types ──────────────────────────────────────────────────────────────

export interface MigrationBatch {
    id: string;
    batchName: string;
    entityType: MigrationEntityType;
    sourceSystem: string;
    status: MigrationBatchStatus;
    totalRecords: number;
    successCount: number;
    failureCount: number;
    startedAt: Date;
    completedAt: Date | null;
    triggeredBy: string;
    notes: string | null;
}

export interface MigrationRecord {
    id: string;
    batchId: string;
    entityType: MigrationEntityType;
    legacyId: string;
    newRecordId: string | null;
    status: MigrationRecordStatus;
    errorMessage: string | null;
    createdAt: Date;
}

// ─── Input types ───────────────────────────────────────────────────────────────

export interface CreateBatchInput {
    batchName: string;
    entityType: MigrationEntityType;
    sourceSystem: string;
    triggeredBy: string;
    notes?: string;
}

export interface CreateRecordInput {
    batchId: string;
    entityType: MigrationEntityType;
    legacyId: string;
    newRecordId?: string;
    status: MigrationRecordStatus;
    errorMessage?: string;
}

export interface ListBatchesInput {
    entityType?: MigrationEntityType;
    status?: MigrationBatchStatus;
    limit?: number;
    offset?: number;
}

export interface RunBatchConfig<T> {
    batchName: string;
    entityType: MigrationEntityType;
    sourceSystem: string;
    triggeredBy: string;
    notes?: string;
    items: T[];
    getLegacyId: (item: T) => string;
    process: (item: T, batchId: string) => Promise<{ newRecordId?: string }>;
}

export interface BatchResult {
    batchId: string;
    totalRecords: number;
    successCount: number;
    failureCount: number;
}