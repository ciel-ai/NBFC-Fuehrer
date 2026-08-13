import { useMutation, useQueryClient, onlineManager } from '@tanstack/react-query';
import { useServices } from '@/src/core/services/ServiceProvider';
import { enqueueMutation } from '@/src/features/sales/api/offlineQueue';
import { salesKeys } from '@/src/features/sales/queries/useSalesQueries';
import { toCdlSalesSubmitBody } from '@/src/features/sales/api/cdlSubmitPayload';
import type {
  SalesProduct,
  SalesSubmitResult,
} from '@/src/entities/salesAgent';

export interface SubmitOutcome {
  queued: boolean;
  result?: SalesSubmitResult;
}

/**
 * The API's error envelope is { success:false, errorCode, message, details }.
 * Joi failures list each offending field in `details`, which is what makes the
 * difference between "Submission failed" and "Loan amount cannot exceed the
 * product value after down payment (₹70,000)".
 */
function apiErrorMessage(err: unknown): string {
  const body = (err as { response?: { data?: unknown } })?.response?.data as
    | { message?: string; details?: unknown }
    | undefined;

  if (!body) return err instanceof Error ? err.message : 'Submission failed';

  const fieldErrors = Array.isArray(body.details)
    ? (body.details as { message?: string }[])
        .map((d) => d?.message)
        .filter((m): m is string => !!m)
    : [];

  if (fieldErrors.length) return fieldErrors.join('\n');
  return body.message ?? 'Submission failed';
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
        // CDL submits the canonical application body, not raw form state —
        // the API strips unknown keys, so anything sent under a wizard-local
        // name would vanish silently. See cdlSubmitPayload.ts.
        const body =
          product === 'cdl'
            ? (toCdlSalesSubmitBody(data, String(data.customerId ?? '')) as unknown as Record<string, unknown>)
            : data;
        const result = await salesService.submitApplication(product, body);
        return { queued: false, result };
      } catch (err) {
        // Network-shaped failure → queue for retry rather than losing the work.
        if (!onlineManager.isOnline()) {
          await enqueueMutation(product, data);
          return { queued: true };
        }
        // A rejected submission is a real answer, not a glitch: a validation
        // failure, an unknown customer, a duplicate application. Surface the
        // API's own message so the agent can act on it — axios's own
        // `.message` is only ever "Request failed with status code 400".
        throw new Error(apiErrorMessage(err));
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: salesKeys.counts(product) });
    },
  });
}
