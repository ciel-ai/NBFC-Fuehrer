import { onlineManager } from '@tanstack/react-query';
import {
  enqueueMoneyOp,
  type MoneyOpName,
} from '@/src/features/sales/api/offlineQueue';

// ---------------------------------------------------------------------------
// Run-or-queue for customer-flow money-movement calls.
//
// Online: run the call now. Offline (or a failure while offline): queue it
// under the caller's Idempotency-Key and let useOfflineFlush replay it on
// reconnect. Because the same key is reused for the replay, a call that partly
// reached the backend before we lost connectivity de-dupes to a single effect
// (see core/api/idempotency.ts) — no double charge / double disburse.
//
// A genuine online failure still throws, so screens surface the error and
// abort rather than faking success (per the No-fake-success rule).
// ---------------------------------------------------------------------------

export type MoneyOpOutcome<T> = { queued: true } | { queued: false; result: T };

export async function runOrQueueMoneyOp<T>(args: {
  op: MoneyOpName;
  applicationId: string;
  idempotencyKey: string;
  payload?: Record<string, unknown>;
  run: () => Promise<T>;
}): Promise<MoneyOpOutcome<T>> {
  const queue = () =>
    enqueueMoneyOp({
      op: args.op,
      applicationId: args.applicationId,
      idempotencyKey: args.idempotencyKey,
      payload: args.payload,
    });

  if (!onlineManager.isOnline()) {
    await queue();
    return { queued: true };
  }
  try {
    const result = await args.run();
    return { queued: false, result };
  } catch (err) {
    // Only swallow the error into the queue when the failure is connectivity-
    // shaped; a real backend rejection (validation, 4xx) must propagate.
    if (!onlineManager.isOnline()) {
      await queue();
      return { queued: true };
    }
    throw err;
  }
}
