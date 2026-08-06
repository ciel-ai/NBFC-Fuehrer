import { describe, it, expect, vi, beforeEach } from 'vitest';

// In-memory appStorage stub keeps react-native out of the node test env.
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

import {
  upsertDraft,
  pickLatestDraft,
  draftLabel,
  flowFromProductName,
  saveApplyDraft,
  readApplyDrafts,
  removeApplyDraft,
  latestApplyDraft,
  type ApplyDraftMap,
  type CustomerApplyDraft,
} from '../customerDraft';

const draft = (
  flow: CustomerApplyDraft['flow'],
  over: Partial<CustomerApplyDraft> = {},
): CustomerApplyDraft => ({
  flow,
  pathname: `/(main)/apply/${flow}-step`,
  params: { applicationId: 'A1' },
  label: `${flow} draft`,
  updatedAt: 1,
  ...over,
});

beforeEach(() => store.clear());

describe('upsertDraft', () => {
  it('keeps one draft per flow, overwriting the same flow', () => {
    let map: ApplyDraftMap = {};
    map = upsertDraft(map, draft('gold', { updatedAt: 1 }));
    map = upsertDraft(map, draft('cdl', { updatedAt: 2 }));
    map = upsertDraft(map, draft('gold', { updatedAt: 3, pathname: '/newer' }));
    expect(Object.keys(map).sort()).toEqual(['cdl', 'gold']);
    expect(map.gold?.updatedAt).toBe(3);
    expect(map.gold?.pathname).toBe('/newer');
  });
});

describe('pickLatestDraft', () => {
  it('returns null for an empty map', () => {
    expect(pickLatestDraft({})).toBeNull();
  });
  it('returns the most recently updated draft across flows', () => {
    const map: ApplyDraftMap = {
      gold: draft('gold', { updatedAt: 10 }),
      cdl: draft('cdl', { updatedAt: 42 }),
      housing: draft('housing', { updatedAt: 5 }),
    };
    expect(pickLatestDraft(map)?.flow).toBe('cdl');
  });
});

describe('draftLabel', () => {
  it('appends a formatted amount when present', () => {
    expect(draftLabel('gold', { maxLoan: '150000' })).toBe('Gold Loan · ₹1,50,000');
    expect(draftLabel('cdl', { approvedAmount: '90000' })).toBe(
      'Consumer Durable Loan · ₹90,000',
    );
  });
  it('falls back to the product name without an amount', () => {
    expect(draftLabel('housing', {})).toBe('Affordable Housing Loan');
    expect(draftLabel('gold', { maxLoan: '0' })).toBe('Gold Loan');
  });
});

describe('flowFromProductName', () => {
  it('classifies known product names', () => {
    expect(flowFromProductName('Gold Loan')).toBe('gold');
    expect(flowFromProductName('Affordable Housing')).toBe('housing');
    expect(flowFromProductName('Consumer Durable Loan')).toBe('cdl');
  });
  it('returns null when unclassifiable', () => {
    expect(flowFromProductName('Personal Loan')).toBeNull();
    expect(flowFromProductName(undefined)).toBeNull();
  });
});

describe('storage round-trip', () => {
  it('saves, reads back, picks latest, and removes per flow', async () => {
    await saveApplyDraft(draft('gold', { updatedAt: 1 }));
    await saveApplyDraft(draft('cdl', { updatedAt: 2 }));

    const map = await readApplyDrafts();
    expect(Object.keys(map).sort()).toEqual(['cdl', 'gold']);
    expect((await latestApplyDraft())?.flow).toBe('cdl');

    await removeApplyDraft('cdl');
    expect(Object.keys(await readApplyDrafts())).toEqual(['gold']);
    expect((await latestApplyDraft())?.flow).toBe('gold');
  });

  it('tolerates corrupt storage', async () => {
    store.set('nbfc_customer_apply_drafts', '{not json');
    expect(await readApplyDrafts()).toEqual({});
    expect(await latestApplyDraft()).toBeNull();
  });
});
