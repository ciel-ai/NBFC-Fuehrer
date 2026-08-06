import { describe, expect, it } from 'vitest';
import { inr, inrCompact, pct } from '../format';

describe('inr', () => {
  it('formats with Indian digit grouping', () => {
    expect(inr(1234567)).toBe('₹12,34,567');
    expect(inr(0)).toBe('₹0');
  });
  it('honours fraction digits', () => {
    expect(inr(1234.5, 2)).toBe('₹1,234.50');
  });
});

describe('inrCompact', () => {
  it('uses lakh/crore notation', () => {
    expect(inrCompact(4_50_000)).toBe('₹4.50L');
    expect(inrCompact(1_20_00_000)).toBe('₹1.20Cr');
    expect(inrCompact(85_000)).toBe('₹85.0K');
    expect(inrCompact(500)).toBe('₹500');
  });
});

describe('pct', () => {
  it('formats percentages', () => {
    expect(pct(72.456)).toBe('72.5%');
    expect(pct(75, 0)).toBe('75%');
  });
});
