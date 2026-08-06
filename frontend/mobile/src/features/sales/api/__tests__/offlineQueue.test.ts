import { describe, it, expect, vi, beforeEach } from 'vitest';

const store = new Map<string, string>();
vi.mock('@/src/core/storage/storage', () => ({
  appStorage: {
    get: async (k: string) => store.get(k) ?? null,
    set: async (k: string, v: string) => {
      store.set(k, v);
    },
    remove: async (k: string) => {
      store.delete(k);
    },
  },
}));

let n = 0;
vi.mock('expo-crypto', () => ({ randomUUID: () => `uuid-${++n}` }));

import {
  enqueueMutation,
  enqueueMoneyOp,
  readQueue,
  removeMutation,
  queueLength,
  type MoneyOp,
  type SalesSubmitOp,
} from '../offlineQueue';

const KEY = 'nbfc_sales_offline_queue';

beforeEach(() => {
  store.clear();
  n = 0;
});

describe('sales-submit ops', () => {
  it('enqueues with a sales-submit kind and reads back', async () => {
    await enqueueMutation('gold', { fullName: 'A' });
    const q = await readQueue();
    expect(q).toHaveLength(1);
    expect(q[0].kind).toBe('sales-submit');
    expect((q[0] as SalesSubmitOp).product).toBe('gold');
  });
});

describe('money ops', () => {
  it('enqueues a money op carrying its idempotency key + payload', async () => {
    await enqueueMoneyOp({
      op: 'gold-nach',
      applicationId: 'GLA-1',
      idempotencyKey: 'idem-1',
    });
    await enqueueMoneyOp({
      op: 'cdl-disburse',
      applicationId: 'CDL-1',
      idempotencyKey: 'idem-2',
      payload: { amount: 5000, merchantName: 'Croma' },
    });
    const q = await readQueue();
    expect(q.map((i) => i.kind)).toEqual(['money', 'money']);
    const [a, b] = q as MoneyOp[];
    expect(a.op).toBe('gold-nach');
    expect(a.idempotencyKey).toBe('idem-1');
    expect(b.payload).toEqual({ amount: 5000, merchantName: 'Croma' });
  });
});

describe('mixed queue + removal', () => {
  it('holds both kinds and removes by id', async () => {
    const submit = await enqueueMutation('cdl', { x: 1 });
    await enqueueMoneyOp({ op: 'gold-nach', applicationId: 'G1', idempotencyKey: 'k' });
    expect(await queueLength()).toBe(2);
    await removeMutation(submit.id);
    const q = await readQueue();
    expect(q).toHaveLength(1);
    expect(q[0].kind).toBe('money');
  });
});

describe('legacy normalization', () => {
  it('treats pre-kind entries as sales submits', async () => {
    // An entry written by an older build had no `kind`.
    store.set(KEY, JSON.stringify([{ id: 'old', product: 'housing', data: {}, queuedAt: 1 }]));
    const q = await readQueue();
    expect(q).toHaveLength(1);
    expect(q[0].kind).toBe('sales-submit');
  });

  it('drops unrecognisable entries', async () => {
    store.set(KEY, JSON.stringify([{ id: 'junk' }, null, 5]));
    expect(await readQueue()).toEqual([]);
  });
});

describe('keyed-storage resilience', () => {
  it('a single corrupt entry does not sink the rest of the queue', async () => {
    const a = await enqueueMoneyOp({ op: 'gold-nach', applicationId: 'G1', idempotencyKey: 'k1' });
    await enqueueMoneyOp({ op: 'cdl-nach', applicationId: 'C1', idempotencyKey: 'k2' });

    // Simulate a torn write to one entry — its own key holds garbage.
    store.set(`${KEY}:${a.id}`, '{ not json');

    const q = await readQueue();
    expect(q).toHaveLength(1);
    expect((q[0] as MoneyOp).idempotencyKey).toBe('k2');
  });
});
