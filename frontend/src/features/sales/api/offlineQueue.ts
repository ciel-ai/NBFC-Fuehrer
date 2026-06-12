import * as Crypto from 'expo-crypto';
import { appStorage } from '@/src/core/storage/storage';
import { SECURE_STORE_KEYS } from '@/src/core/utils/constants';
import type {
  SalesOfflineMutation,
  SalesProduct,
} from '@/src/entities/salesAgent';

// ---------------------------------------------------------------------------
// Offline data-capture queue.
//
// When a final submit fails (no connectivity), the mutation payload is queued
// here and flushed on reconnect. Pairs with react-query's onlineManager, which
// app/_layout.tsx already drives from AppState / window online events.
// ---------------------------------------------------------------------------

const KEY = SECURE_STORE_KEYS.SALES_OFFLINE_QUEUE;

export async function readQueue(): Promise<SalesOfflineMutation[]> {
  const raw = await appStorage.get(KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as SalesOfflineMutation[];
  } catch {
    return [];
  }
}

async function writeQueue(items: SalesOfflineMutation[]): Promise<void> {
  await appStorage.set(KEY, JSON.stringify(items));
}

export async function enqueueMutation(
  product: SalesProduct,
  data: Record<string, unknown>,
): Promise<SalesOfflineMutation> {
  const item: SalesOfflineMutation = {
    id: `q_${Crypto.randomUUID()}`,
    product,
    data,
    queuedAt: Date.now(),
  };
  const items = await readQueue();
  items.push(item);
  await writeQueue(items);
  return item;
}

export async function removeMutation(id: string): Promise<void> {
  const items = await readQueue();
  await writeQueue(items.filter((i) => i.id !== id));
}

export async function queueLength(): Promise<number> {
  return (await readQueue()).length;
}
