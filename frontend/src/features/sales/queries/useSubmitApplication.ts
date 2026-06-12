import { useMutation, useQueryClient, onlineManager } from '@tanstack/react-query';
import { useServices } from '@/src/core/services/ServiceProvider';
import { enqueueMutation } from '@/src/features/sales/api/offlineQueue';
import { salesKeys } from '@/src/features/sales/queries/useSalesQueries';
import type {
  SalesProduct,
  SalesSubmitResult,
} from '@/src/entities/salesAgent';

export interface SubmitOutcome {
  queued: boolean;
  result?: SalesSubmitResult;
}

/**
 * Final submit with offline capture. If the device is offline the payload is
 * queued (returning `queued: true`) and flushed on reconnect by
 * useOfflineFlush; otherwise it is submitted immediately.
 */
export function useSubmitApplication(product: SalesProduct) {
  const { salesService } = useServices();
  const queryClient = useQueryClient();

  return useMutation<SubmitOutcome, Error, Record<string, unknown>>({
    mutationFn: async (data) => {
      if (!onlineManager.isOnline()) {
        await enqueueMutation(product, data);
        return { queued: true };
      }
      try {
        const result = await salesService.submitApplication(product, data);
        return { queued: false, result };
      } catch (err) {
        // Network-shaped failure → queue for retry rather than losing the work.
        if (!onlineManager.isOnline()) {
          await enqueueMutation(product, data);
          return { queued: true };
        }
        throw err;
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: salesKeys.counts(product) });
    },
  });
}
