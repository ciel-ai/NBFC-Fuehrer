// src/hooks/useNach.ts
//
// Live-data hooks for the recurring-debit (e-NACH) and reconciliation screens.
// Same contract as the other feeds: live-first, labelled sample fallback, and
// the reason for the fallback is kept rather than swallowed. See useLiveData.ts.

import { useMemo } from 'react';
import { nachApi } from '../api/nach.api';
import { MOCK_NACH } from '../data/nach';
import { useLiveData } from './useLiveData';
import type { LiveResult } from './useLiveData';
import type { NachBatch, NachDebitItem, ReconciliationRow } from '../types';

/** Every batch run in the window, newest first. */
export function useNachBatches(): LiveResult<NachBatch[]> {
  return useLiveData<NachBatch[]>(() => nachApi.listBatches({ limit: 30 }), MOCK_NACH.batches);
}

/**
 * Line items for one batch.
 *
 * `batchId` is allowed to be undefined while the batch list is still resolving;
 * the fetch is skipped until it is known, rather than firing at `/undefined`.
 */
export function useNachBatchItems(batchId: string | undefined): LiveResult<NachDebitItem[]> {
  const fallback = useMemo(
    () => (batchId ? MOCK_NACH.items.filter((i) => i.batchId === batchId) : []),
    [batchId],
  );

  return useLiveData<NachDebitItem[]>(
    () => (batchId ? nachApi.listBatchItems(batchId) : Promise.resolve([])),
    fallback,
    [batchId],
  );
}

export function useReconciliation(): LiveResult<ReconciliationRow[]> {
  return useLiveData<ReconciliationRow[]>(
    () => nachApi.getReconciliation({ limit: 500 }),
    MOCK_NACH.reconciliation,
  );
}
