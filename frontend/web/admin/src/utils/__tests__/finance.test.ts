import { describe, expect, it } from 'vitest';
import { calcFees, buildAmortization } from '../finance';
import { calcEmi } from '../format';

// ─── calcEmi — reducing-balance EMI (Testing Audit finding #1, section 4A) ──────

describe('calcEmi', () => {
  it('returns principal/months at 0% interest', () => {
    expect(calcEmi(120000, 0, 12)).toBe(10000);
    expect(calcEmi(1200000, 0, 24)).toBe(50000);
  });

  it('handles a 1-month tenure (0% = full principal)', () => {
    expect(calcEmi(50000, 0, 1)).toBe(50000);
  });

  it('handles a 1-month tenure with interest (principal + one month interest)', () => {
    // r = 1%/month → EMI = 100000 * 1.01 = 101000
    expect(calcEmi(100000, 12, 1)).toBe(101000);
  });

  it('matches the standard EMI for ₹1,00,000 @ 12% for 12 months', () => {
    expect(calcEmi(100000, 12, 12)).toBe(8885);
  });

  it('produces a positive EMI that repays at least the principal for a large loan', () => {
    const emi = calcEmi(10000000, 9, 240); // ₹1cr, 9%, 20 years
    expect(emi).toBeGreaterThan(0);
    expect(emi * 240).toBeGreaterThan(10000000);
  });
});

// ─── calcFees — per-product fee schedule ────────────────────────────────────────

describe('calcFees', () => {
  it('computes CDL fees (2.5% processing, 1.2% insurance)', () => {
    expect(calcFees('CDL', 100000)).toEqual({
      processingFee: 2500,
      gst: 450,
      insurance: 1200,
      stampDuty: 100,
      documentation: 250,
      netDisbursement: 95500,
    });
  });

  it('computes GOLD fees (0.5% processing, no insurance)', () => {
    expect(calcFees('GOLD', 200000)).toEqual({
      processingFee: 1000,
      gst: 180,
      insurance: 0,
      stampDuty: 100,
      documentation: 250,
      netDisbursement: 198470,
    });
  });

  it('computes HOUSING fees (1% processing, 0.4% insurance, higher flat fees)', () => {
    expect(calcFees('HOUSING', 1000000)).toEqual({
      processingFee: 10000,
      gst: 1800,
      insurance: 4000,
      stampDuty: 600,
      documentation: 1500,
      netDisbursement: 982100,
    });
  });

  it('rounds the processing fee to the nearest ₹100', () => {
    // 123456 * 2.5% = 3086.4 → nearest 100 = 3100
    expect(calcFees('CDL', 123456).processingFee).toBe(3100);
  });

  it('GST is always 18% of the processing fee', () => {
    for (const amount of [50000, 123456, 750000, 2500000]) {
      const f = calcFees('HOUSING', amount);
      expect(f.gst).toBe(Math.round(f.processingFee * 0.18));
    }
  });

  it('netDisbursement equals approved minus every fee', () => {
    const approved = 640000;
    const f = calcFees('CDL', approved);
    expect(f.netDisbursement).toBe(
      approved - f.processingFee - f.gst - f.insurance - f.stampDuty - f.documentation,
    );
  });
});

// ─── buildAmortization — schedule invariants ───────────────────────────────────

describe('buildAmortization', () => {
  const cases: Array<[number, number, number]> = [
    [100000, 12, 12],
    [640000, 14, 24],
    [10000000, 9, 240],
    [50000, 0, 6], // 0% interest
    [75000, 18, 1], // single instalment
  ];

  it.each(cases)('principal=%i rate=%i months=%i → row count equals tenure', (p, r, m) => {
    expect(buildAmortization(p, r, m)).toHaveLength(m);
  });

  it.each(cases)('principal=%i rate=%i months=%i → principal repaid sums exactly', (p, r, m) => {
    const total = buildAmortization(p, r, m).reduce((sum, row) => sum + row.principal, 0);
    expect(total).toBe(p);
  });

  it.each(cases)('principal=%i rate=%i months=%i → final balance closes to 0', (p, r, m) => {
    const rows = buildAmortization(p, r, m);
    expect(rows[rows.length - 1]!.balance).toBe(0);
  });

  it('final instalment absorbs rounding (emi = its principal + interest)', () => {
    const rows = buildAmortization(100000, 12, 12);
    const last = rows[rows.length - 1]!;
    expect(last.emi).toBe(last.principal + last.interest);
  });

  it('non-final instalments use the level EMI from calcEmi', () => {
    const emi = calcEmi(100000, 12, 12);
    const rows = buildAmortization(100000, 12, 12);
    for (const row of rows.slice(0, -1)) {
      expect(row.emi).toBe(emi);
    }
  });

  it('interest declines as the balance reduces', () => {
    const rows = buildAmortization(100000, 12, 12);
    expect(rows[0]!.interest).toBeGreaterThan(rows[rows.length - 1]!.interest);
  });

  it('at 0% interest every rupee of the EMI is principal', () => {
    const rows = buildAmortization(50000, 0, 6);
    for (const row of rows) expect(row.interest).toBe(0);
  });
});
