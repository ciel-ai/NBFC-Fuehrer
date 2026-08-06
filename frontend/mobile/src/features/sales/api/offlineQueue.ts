import * as Crypto from 'expo-crypto';
import { appStorage } from '@/src/core/storage/storage';
import { SECURE_STORE_KEYS } from '@/src/core/utils/constants';
import type { SalesProduct } from '@/src/entities/salesAgent';

// ---------------------------------------------------------------------------
// Offline operation queue — ONE mechanism for both:
//   • the agent wizard's final submit (`sales-submit`), and
//   • the customer flow's money-movement calls (`money`) — NACH mandate,
//     disbursal, etc. — which must survive a submit made in airplane mode.
//
// When an op fails for lack of connectivity it is queued here and drained on
// reconnect by useOfflineFlush, which pairs with react-query's onlineManager
// (driven from AppState / window online events in app/_layout.tsx).
//
// Money ops carry the caller's Idempotency-Key, so a queued-then-flushed call
// de-dupes against any partial online attempt (see core/api/idempotency.ts) —
// no double charge / double disburse.
// ---------------------------------------------------------------------------

// Storage layout (keyed, not one blob):
//   KEY                 → JSON array of op ids, in queue order ("the index").
//   `${KEY}:${id}`      → JSON of a single QueuedOperation ("an entry").
//
// Each mutation writes at most one entry plus the index, so a torn write can
// corrupt only that one entry or leave an orphan — never the whole queue, as
// the previous single-blob rewrite could. readQueue tolerates a missing or
// unparseable entry by skipping it.
const KEY = SECURE_STORE_KEYS.SALES_OFFLINE_QUEUE;

const entryKey = (id: string): string => `${KEY}:${id}`;

interface BaseOp {
  id: string;
  queuedAt: number;
}

/** Agent wizard final submit. */
export interface SalesSubmitOp extends BaseOp {
  kind: 'sales-submit';
  product: SalesProduct;
  data: Record<string, unknown>;
}

/** Customer-flow money-movement call, replayed against a named service op. */
export interface MoneyOp extends BaseOp {
  kind: 'money';
  /** Registry key resolved to a service call by useOfflineFlush. */
  op: MoneyOpName;
  applicationId: string;
  idempotencyKey: string;
  payload?: Record<string, unknown>;
}

export type MoneyOpName =
  | 'gold-nach'
  | 'gold-disburse'
  | 'cdl-nach'
  | 'cdl-disburse'
  | 'housing-nach'
  | 'housing-disburse';

export type QueuedOperation = SalesSubmitOp | MoneyOp;

/** Back-compat alias — older call sites referred to the sales-submit shape. */
export type SalesOfflineMutation = SalesSubmitOp;

/** Normalize legacy entries (pre-`kind`) as sales submits. */
function normalize(raw: unknown): QueuedOperation | null {
  if (!raw || typeof raw !== 'object') return null;
  const op = raw as Record<string, unknown>;
  if (op.kind === 'money') return op as unknown as MoneyOp;
  if (op.kind === 'sales-submit' || (op.product && op.data)) {
    return { ...(op as object), kind: 'sales-submit' } as SalesSubmitOp;
  }
  return null;
}

/**
 * Read the id index, migrating a legacy single-blob queue on first touch.
 *
 * New format: KEY holds a JSON array of string ids. Legacy builds stored a
 * JSON array of op *objects* under KEY; when we see that we split each op out
 * into its own entry, rewrite KEY as the id array, and return the ids — a
 * one-time O(n) cost that never recurs.
 */
async function readIndex(): Promise<string[]> {
  const raw = await appStorage.get(KEY);
  if (!raw) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(parsed) || parsed.length === 0) return [];

  // Already the new format.
  if (parsed.every((x) => typeof x === 'string')) return parsed as string[];

  // Legacy blob of op objects → migrate to keyed entries + id index.
  const ops = (parsed as unknown[])
    .map(normalize)
    .filter((op): op is QueuedOperation => Boolean(op) && typeof op?.id === 'string');
  const ids: string[] = [];
  for (const op of ops) {
    await appStorage.set(entryKey(op.id), JSON.stringify(op));
    ids.push(op.id);
  }
  await appStorage.set(KEY, JSON.stringify(ids));
  return ids;
}

async function writeIndex(ids: string[]): Promise<void> {
  await appStorage.set(KEY, JSON.stringify(ids));
}

export async function readQueue(): Promise<QueuedOperation[]> {
  const ids = await readIndex();
  const entries = await Promise.all(
    ids.map(async (id) => {
      const raw = await appStorage.get(entryKey(id));
      if (!raw) return null; // missing entry (e.g. orphaned index id) — skip
      try {
        return normalize(JSON.parse(raw));
      } catch {
        return null; // a single corrupt entry never sinks the whole queue
      }
    }),
  );
  return entries.filter(Boolean) as QueuedOperation[];
}

async function append(item: QueuedOperation): Promise<void> {
  // Write the entry first, then publish it in the index. If we tear between
  // the two, the entry is an unreferenced orphan (harmless) rather than a
  // half-written index that drops sibling ops.
  await appStorage.set(entryKey(item.id), JSON.stringify(item));
  const ids = await readIndex();
  ids.push(item.id);
  await writeIndex(ids);
}

/** Queue an agent-wizard submit for later flush. */
export async function enqueueMutation(
  product: SalesProduct,
  data: Record<string, unknown>,
): Promise<SalesSubmitOp> {
  const item: SalesSubmitOp = {
    id: `q_${Crypto.randomUUID()}`,
    kind: 'sales-submit',
    product,
    data,
    queuedAt: Date.now(),
  };
  await append(item);
  return item;
}

/** Queue a customer-flow money-movement call for later flush. */
export async function enqueueMoneyOp(args: {
  op: MoneyOpName;
  applicationId: string;
  idempotencyKey: string;
  payload?: Record<string, unknown>;
}): Promise<MoneyOp> {
  const item: MoneyOp = {
    id: `q_${Crypto.randomUUID()}`,
    kind: 'money',
    op: args.op,
    applicationId: args.applicationId,
    idempotencyKey: args.idempotencyKey,
    payload: args.payload,
    queuedAt: Date.now(),
  };
  await append(item);
  return item;
}

export async function removeMutation(id: string): Promise<void> {
  // Unpublish from the index first (so it's no longer replayed), then drop the
  // entry. Order is safe either way — a leftover entry with no index id is an
  // inert orphan.
  const ids = await readIndex();
  if (ids.includes(id)) {
    await writeIndex(ids.filter((x) => x !== id));
  }
  await appStorage.remove(entryKey(id));
}

export async function queueLength(): Promise<number> {
  return (await readIndex()).length;
}
