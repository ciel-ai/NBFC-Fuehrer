import { useCallback, useEffect, useState } from 'react';
import { onlineManager, useQueryClient } from '@tanstack/react-query';
import { useServices } from '@/src/core/services/ServiceProvider';
import {
  readQueue,
  removeMutation,
} from '@/src/features/sales/api/offlineQueue';
import { salesKeys } from '@/src/features/sales/queries/useSalesQueries';

let isFlushingQueue = false;

/**
 * Drains the offline submission queue whenever connectivity is (re)gained.
 * Returns the count of items still pending so a screen can surface an
 * "X applications waiting to sync" banner.
 */
export function useOfflineFlush() {
  const { salesService } = useServices();
  const queryClient = useQueryClient();
  const [pending, setPending] = useState(0);

  const refreshPending = useCallback(async () => {
    setPending((await readQueue()).length);
  }, []);

  const flush = useCallback(async () => {
    if (!onlineManager.isOnline()) return;
    if (isFlushingQueue) {
      await refreshPending();
      return;
    }
    isFlushingQueue = true;
    const items = await readQueue();
    try {
      for (const item of items) {
        try {
          await salesService.submitApplication(item.product, item.data);
          await removeMutation(item.id);
          void queryClient.invalidateQueries({ queryKey: salesKeys.counts(item.product) });
        } catch {
          // Leave the item queued; the next online event retries it.
          break;
        }
      }
    } finally {
      isFlushingQueue = false;
      await refreshPending();
    }
  }, [salesService, queryClient, refreshPending]);

  useEffect(() => {
    void refreshPending();
    void flush();
    const unsubscribe = onlineManager.subscribe((online) => {
      if (online) void flush();
      else void refreshPending();
    });
    return unsubscribe;
  }, [flush, refreshPending]);

  return { pending };
}
