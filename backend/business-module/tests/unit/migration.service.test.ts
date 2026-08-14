// tests/unit/migration.service.test.ts

const mockCreateBatch = jest.fn();
const mockFindBatchByIdOrThrow = jest.fn();
const mockListBatches = jest.fn();
const mockSetTotalRecords = jest.fn();
const mockIncrementSuccess = jest.fn();
const mockIncrementFailure = jest.fn();
const mockCompleteBatch = jest.fn();
const mockFailBatch = jest.fn();
const mockCreateRecord = jest.fn();
const mockFindRecord = jest.fn();

jest.mock('@/modules/migration/migration.repository', () => ({
    migrationRepository: {
        createBatch: (...args: unknown[]) => mockCreateBatch(...args),
        findBatchByIdOrThrow: (...args: unknown[]) => mockFindBatchByIdOrThrow(...args),
        listBatches: (...args: unknown[]) => mockListBatches(...args),
        setTotalRecords: (...args: unknown[]) => mockSetTotalRecords(...args),
        incrementSuccess: (...args: unknown[]) => mockIncrementSuccess(...args),
        incrementFailure: (...args: unknown[]) => mockIncrementFailure(...args),
        completeBatch: (...args: unknown[]) => mockCompleteBatch(...args),
        failBatch: (...args: unknown[]) => mockFailBatch(...args),
        createRecord: (...args: unknown[]) => mockCreateRecord(...args),
        findRecord: (...args: unknown[]) => mockFindRecord(...args),
    },
}));

jest.mock('@/config/logger', () => ({
    createModuleLogger: () => ({
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
        debug: jest.fn(),
    }),
}));

import { migrationService } from '@/modules/migration/migration.service';

const BATCH_ID = 'batch-001';

const fakeBatch = {
    id: BATCH_ID,
    batchName: 'test-batch',
    entityType: 'CUSTOMER' as const,
    sourceSystem: 'legacy-core',
    status: 'RUNNING' as const,
    totalRecords: 0,
    successCount: 0,
    failureCount: 0,
    startedAt: new Date(),
    completedAt: null,
    triggeredBy: 'admin@test.com',
    notes: null,
};

describe('migrationService.runBatch', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockCreateBatch.mockResolvedValue(fakeBatch);
        mockSetTotalRecords.mockResolvedValue(undefined);
        mockIncrementSuccess.mockResolvedValue(undefined);
        mockIncrementFailure.mockResolvedValue(undefined);
        mockCompleteBatch.mockResolvedValue(undefined);
        mockFailBatch.mockResolvedValue(undefined);
        mockCreateRecord.mockResolvedValue({});
        mockFindRecord.mockResolvedValue(null); // not already migrated by default
    });

    it('all records succeed — completeBatch called, correct counts returned', async () => {
        const items = [
            { legacyId: 'L001', name: 'Alice' },
            { legacyId: 'L002', name: 'Bob' },
        ];
        const mockProcess = jest.fn().mockResolvedValue({ newRecordId: 'new-uuid-1' });

        const result = await migrationService.runBatch({
            batchName: 'test-batch',
            entityType: 'CUSTOMER',
            sourceSystem: 'legacy-core',
            triggeredBy: 'admin@test.com',
            items,
            getLegacyId: (item) => item.legacyId,
            process: mockProcess,
        });

        expect(mockCreateBatch).toHaveBeenCalledTimes(1);
        expect(mockSetTotalRecords).toHaveBeenCalledWith(BATCH_ID, 2);
        expect(mockProcess).toHaveBeenCalledTimes(2);
        expect(mockCreateRecord).toHaveBeenCalledTimes(2);
        expect(mockCreateRecord).toHaveBeenCalledWith(expect.objectContaining({ status: 'SUCCESS', legacyId: 'L001' }));
        expect(mockCreateRecord).toHaveBeenCalledWith(expect.objectContaining({ status: 'SUCCESS', legacyId: 'L002' }));
        expect(mockIncrementSuccess).toHaveBeenCalledTimes(2);
        expect(mockIncrementFailure).not.toHaveBeenCalled();
        expect(mockCompleteBatch).toHaveBeenCalledWith(BATCH_ID);
        expect(mockFailBatch).not.toHaveBeenCalled();
        expect(result).toEqual({ batchId: BATCH_ID, totalRecords: 2, successCount: 2, failureCount: 0 });
    });

    it('one record fails — failBatch called, other records still processed', async () => {
        const items = [
            { legacyId: 'L001', name: 'Alice' },
            { legacyId: 'L002', name: 'Bob' },
            { legacyId: 'L003', name: 'Charlie' },
        ];
        const mockProcess = jest.fn()
            .mockResolvedValueOnce({ newRecordId: 'new-uuid-1' })
            .mockRejectedValueOnce(new Error('duplicate key violation'))
            .mockResolvedValueOnce({ newRecordId: 'new-uuid-3' });

        const result = await migrationService.runBatch({
            batchName: 'test-batch',
            entityType: 'CUSTOMER',
            sourceSystem: 'legacy-core',
            triggeredBy: 'admin@test.com',
            items,
            getLegacyId: (item) => item.legacyId,
            process: mockProcess,
        });

        expect(mockProcess).toHaveBeenCalledTimes(3);
        expect(mockIncrementSuccess).toHaveBeenCalledTimes(2);
        expect(mockIncrementFailure).toHaveBeenCalledTimes(1);
        expect(mockCreateRecord).toHaveBeenCalledWith(
            expect.objectContaining({ status: 'FAILED', legacyId: 'L002', errorMessage: 'duplicate key violation' }),
        );
        expect(mockFailBatch).toHaveBeenCalledWith(BATCH_ID);
        expect(mockCompleteBatch).not.toHaveBeenCalled();
        expect(result).toEqual({ batchId: BATCH_ID, totalRecords: 3, successCount: 2, failureCount: 1 });
    });

    it('already-migrated record is skipped — process and createRecord not called for it', async () => {
        const items = [
            { legacyId: 'L001', name: 'Alice' },
            { legacyId: 'L002', name: 'Bob' },
        ];
        const mockProcess = jest.fn().mockResolvedValue({ newRecordId: 'new-uuid' });

        // L001 was already migrated
        mockFindRecord.mockImplementation((_batchId: string, _entityType: string, legacyId: string) =>
            legacyId === 'L001' ? Promise.resolve({ id: 'existing-record' }) : Promise.resolve(null),
        );

        const result = await migrationService.runBatch({
            batchName: 'test-batch',
            entityType: 'CUSTOMER',
            sourceSystem: 'legacy-core',
            triggeredBy: 'admin@test.com',
            items,
            getLegacyId: (item) => item.legacyId,
            process: mockProcess,
        });

        expect(mockProcess).toHaveBeenCalledTimes(1);
        expect(mockProcess).toHaveBeenCalledWith(items[1], BATCH_ID);
        expect(mockCreateRecord).toHaveBeenCalledTimes(1);
        expect(mockCreateRecord).toHaveBeenCalledWith(expect.objectContaining({ legacyId: 'L002' }));
        expect(mockIncrementSuccess).toHaveBeenCalledTimes(1);
        expect(mockCompleteBatch).toHaveBeenCalledWith(BATCH_ID);
        expect(result).toEqual({ batchId: BATCH_ID, totalRecords: 2, successCount: 1, failureCount: 0 });
    });
});

describe('migrationService.getBatch', () => {
    it('delegates to repository findBatchByIdOrThrow', async () => {
        mockFindBatchByIdOrThrow.mockResolvedValue(fakeBatch);
        const result = await migrationService.getBatch(BATCH_ID);
        expect(mockFindBatchByIdOrThrow).toHaveBeenCalledWith(BATCH_ID);
        expect(result).toEqual(fakeBatch);
    });
});

describe('migrationService.listBatches', () => {
    it('delegates to repository listBatches with filters', async () => {
        mockListBatches.mockResolvedValue([fakeBatch]);
        const input = { entityType: 'CUSTOMER' as const, status: 'RUNNING' as const };
        const result = await migrationService.listBatches(input);
        expect(mockListBatches).toHaveBeenCalledWith(input);
        expect(result).toHaveLength(1);
    });
});