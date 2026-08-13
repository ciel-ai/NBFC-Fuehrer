import { useCallback, useEffect, useState } from 'react';
import { onlineManager, useQueryClient } from '@tanstack/react-query';
import { useServices, type Services } from '@/src/core/services/ServiceProvider';
import {
  readQueue,
  removeMutation,
  type MoneyOp,
  type QueuedOperation,
  type SalesSubmitOp,
} from '@/src/features/sales/api/offlineQueue';
import { salesKeys } from '@/src/features/sales/queries/useSalesQueries';
import type { CdlNachInput } from '@/src/entities/consumerDurableLoan';

let isFlushingQueue = false;

/** Replay one queued money-movement op against its service (idempotency-keyed). */
async function runMoneyOp(services: Services, op: MoneyOp): Promise<void> {
  const { applicationId, idempotencyKey, payload } = op;
  const p = (payload ?? {}) as Record<string, unknown>;
  switch (op.op) {
    case 'gold-nach':
      await services.goldLoanService.initiateNach(applicationId, idempotencyKey);
      return;
    case 'cdl-nach':
      await services.consumerDurableLoanService.registerNachMandate(
        applicationId,
        p as CdlNachInput,
        idempotencyKey,
      );
      return;
    case 'cdl-disburse':
      await services.consumerDurableLoanService.disburseToMerchant(
        applicationId,
        p as { amount: number; merchantName: string },
        idempotencyKey,
      );
      return;
    case 'housing-nach':
      await services.housingLoanService.registerNach(
        applicationId,
        p as { emi: number; bankAccount: string },
        idempotencyKey,
      );
      return;
    case 'housing-disburse':
      await services.housingLoanService.disburseToBuilder(
        applicationId,
        p as { amount: number; builderName: string },
        idempotencyKey,
      );
      return;
    case 'gold-disburse':
      // Gold disbursal is backend-owned confirmation only; nothing to replay.
      return;
    default:
      return;
  }
}

/**
 * Drains the offline operation queue whenever connectivity is (re)gained.
 * Handles both agent submits and customer money-movement ops (one queue).
 * Returns the count of items still pending so a screen can surface an
 * "X items waiting to sync" banner.
 */
export function useOfflineFlush() {
  const services = useServices();
  const queryClient = useQueryClient();
  const [pending, setPending] = useState(0);

  const refreshPending = useCallback(async () => {
    setPending((await readQueue()).length);
  }, []);

  const runOne = useCallback(
    async (item: QueuedOperation): Promise<void> => {
      if (item.kind === 'money') {
        await runMoneyOp(services, item);
        return;
      }
      const submit = item as SalesSubmitOp;
      await services.salesService.submitApplication(submit.product, submit.data);
      void queryClient.invalidateQueries({ queryKey: salesKeys.counts(submit.product) });
    },
    [services, queryClient],
  );

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
          await runOne(item);
          await removeMutation(item.id);
        } catch {
          // Leave the item queued; the next online event retries it.
          break;
        }
      }
    } finally {
      isFlushingQueue = false;
      await refreshPending();
    }
  }, [runOne, refreshPending]);

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
