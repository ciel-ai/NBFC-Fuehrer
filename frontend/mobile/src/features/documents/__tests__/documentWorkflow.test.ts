import { describe, it, expect, vi } from 'vitest';

// The mock services only need `mockDelay` from the api module. Stubbing it to
// resolve immediately keeps the whole react-native / axios chain out of the
// node test environment and removes the artificial delays.
vi.mock('@/src/core/api/api', () => ({
  mockDelay: <T>(data: T): Promise<T> => Promise.resolve(data),
}));

import { mockGoldLoanService } from '@/src/core/services/mocks/mockGoldLoanService';
import { mockConsumerDurableLoanService } from '@/src/core/services/mocks/mockConsumerDurableLoanService';
import { mockHousingLoanService } from '@/src/core/services/mocks/mockHousingLoanService';

// ─── A1: create application (gold) ────────────────────────────────────────────

describe('gold createApplication (A1)', () => {
  it('returns a real-looking application id in progress', async () => {
    const ref = await mockGoldLoanService.createApplication({
      goldType: 'Jewellery',
      karat: '22K',
      weightGrams: 10,
      estimatedGoldValue: 56600,
      requestedAmount: 42450,
    });
    expect(ref.applicationId).toMatch(/^GLA-\d+$/);
    expect(ref.status).toBe('in_progress');
    expect(() => new Date(ref.createdAt).toISOString()).not.toThrow();
  });

  it('mints a distinct id per call', async () => {
    const a = await mockGoldLoanService.createApplication({
      goldType: 'Coins', karat: '24K', weightGrams: 5, estimatedGoldValue: 30900, requestedAmount: 23175,
    });
    // Ids are timestamp-derived; force a tick so the second differs.
    vi.useFakeTimers();
    vi.setSystemTime(Date.now() + 1000);
    const b = await mockGoldLoanService.createApplication({
      goldType: 'Coins', karat: '24K', weightGrams: 5, estimatedGoldValue: 30900, requestedAmount: 23175,
    });
    vi.useRealTimers();
    expect(a.applicationId).not.toBe(b.applicationId);
  });
});

// ─── A2: document upload (all three products) ─────────────────────────────────

describe('uploadDocument (A2)', () => {
  const cases = [
    { name: 'gold', svc: mockGoldLoanService, appId: 'GLA-12345678' },
    { name: 'cdl', svc: mockConsumerDurableLoanService, appId: 'CDL-APP-12345678' },
    { name: 'housing', svc: mockHousingLoanService, appId: 'HL-APP-12345678' },
  ] as const;

  for (const { name, svc, appId } of cases) {
    it(`${name}: echoes an uploaded document with a hosted url`, async () => {
      const res = await svc.uploadDocument(appId, 'file:///tmp/local-photo.jpg', 'bank_proof');
      expect(res.status).toBe('uploaded');
      expect(res.applicationId).toBe(appId);
      expect(res.type).toBe('bank_proof');
      expect(res.documentId).toBeTruthy();
      // Hosted url is scoped to the application + slot.
      expect(res.url).toContain(appId);
      expect(res.url).toContain('bank_proof');
      expect(() => new Date(res.uploadedAt).toISOString()).not.toThrow();
    });
  }

  it('preserves the logical slot type it was given', async () => {
    for (const type of ['gold_photo_front', 'gold_photo_detail', 'address_proof']) {
      const res = await mockGoldLoanService.uploadDocument('GLA-1', 'file:///x.jpg', type);
      expect(res.type).toBe(type);
    }
  });
});
