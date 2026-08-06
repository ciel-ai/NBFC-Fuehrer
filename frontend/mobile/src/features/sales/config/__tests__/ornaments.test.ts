import { describe, expect, it } from 'vitest';
import {
  emptyOrnament,
  ornamentNetWeight,
  ornamentTotals,
  validateOrnament,
  ornamentsStepSchema,
  type OrnamentEntry,
} from '../ornaments';

const valid = (over: Partial<OrnamentEntry> = {}): OrnamentEntry => ({
  ...emptyOrnament(),
  ornamentType: 'chain',
  itemCount: '2',
  purity: '22',
  grossWeight: '50',
  stoneWeight: '5',
  impurityPct: '10',
  photoUri: 'file:///photo.jpg',
  remarks: '',
  ...over,
});

describe('ornamentNetWeight', () => {
  it('derives (gross − stone) × (1 − impurity/100)', () => {
    // (50 − 5) × 0.9 = 40.5
    expect(ornamentNetWeight(valid())).toBe(40.5);
  });

  it('treats blank stone/impurity as zero', () => {
    expect(ornamentNetWeight(valid({ stoneWeight: '', impurityPct: '' }))).toBe(50);
  });

  it('never goes negative', () => {
    expect(ornamentNetWeight(valid({ stoneWeight: '60' }))).toBe(0);
  });

  it('rounds to 2 decimal places', () => {
    // (10 − 0) × (1 − 0.333) = 6.67
    expect(ornamentNetWeight(valid({ grossWeight: '10', stoneWeight: '', impurityPct: '33.3' }))).toBe(6.67);
  });
});

describe('ornamentTotals', () => {
  it('sums items, gross and net across rows', () => {
    const totals = ornamentTotals([valid(), valid({ itemCount: '3', grossWeight: '20', stoneWeight: '', impurityPct: '' })]);
    expect(totals.items).toBe(5);
    expect(totals.gross).toBe(70);
    expect(totals.net).toBe(60.5);
  });

  it('is zero for an empty schedule', () => {
    expect(ornamentTotals([])).toEqual({ items: 0, gross: 0, net: 0 });
  });
});

describe('validateOrnament', () => {
  it('accepts a complete row', () => {
    expect(validateOrnament(valid())).toEqual({});
  });

  it('requires type, purity and photo', () => {
    const errors = validateOrnament(valid({ ornamentType: '', purity: '', photoUri: '' }));
    expect(errors.ornamentType).toBeTruthy();
    expect(errors.purity).toBeTruthy();
    expect(errors.photoUri).toBeTruthy();
  });

  it('rejects stone weight ≥ gross weight', () => {
    expect(validateOrnament(valid({ stoneWeight: '50' })).stoneWeight).toMatch(/less than/i);
  });

  it('rejects non-integer and oversized item counts', () => {
    expect(validateOrnament(valid({ itemCount: '2.5' })).itemCount).toBeTruthy();
    expect(validateOrnament(valid({ itemCount: '101' })).itemCount).toBeTruthy();
  });

  it('caps gross weight at 10 kg and impurity at 50%', () => {
    expect(validateOrnament(valid({ grossWeight: '10001' })).grossWeight).toBeTruthy();
    expect(validateOrnament(valid({ impurityPct: '51' })).impurityPct).toBeTruthy();
  });
});

describe('ornamentsStepSchema', () => {
  it('requires at least one row', () => {
    expect(ornamentsStepSchema.safeParse({ ornaments: [] }).success).toBe(false);
    expect(ornamentsStepSchema.safeParse({ ornaments: [valid()] }).success).toBe(true);
  });
});
