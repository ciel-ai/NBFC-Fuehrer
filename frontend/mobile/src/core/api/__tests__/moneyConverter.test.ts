// src/core/api/__tests__/moneyConverter.test.ts
//
// Counterpart test to the backend's moneyConverter.middleware.ts — verifies
// this side converts the exact paise-wire shape the backend actually sends
// back to the rupee values the UI must display. Uses the real CDL quote
// response shape (backend/business-module/tests/unit/cdlLoans.quote.test.ts
// CASE 3: ₹50,000 / 12 months / 14%) as the fixture, since that's the field
// set (loanAmount, emi, processingFee, processingFeeGst, totalInterest,
// totalAmount, maxEligibleAmount) this was written to fix.

import { describe, expect, test } from 'vitest';
import { convertMoneyFieldsFromPaise } from '../moneyConverter';

describe('convertMoneyFieldsFromPaise', () => {
  test('CDL quote CASE 3 (₹50,000 / 12mo / 14%) — every money field converts, non-money fields do not', () => {
    // Exact wire shape moneyConverter.middleware.ts produces for this input.
    const wire = {
      loanAmount: 5000000,
      tenureMonths: 12,
      interestRate: 14,
      emi: 448936,
      processingFee: 181700,
      processingFeeGst: 32700,
      totalInterest: 387226,
      totalAmount: 5387226,
      maxEligibleAmount: 5000000,
    };

    const result = convertMoneyFieldsFromPaise(wire) as typeof wire;

    expect(result.emi).toBe(4489.36);
    expect(result.processingFee).toBe(1817);
    expect(result.processingFeeGst).toBe(327);
    expect(result.totalInterest).toBe(3872.26);
    expect(result.totalAmount).toBe(53872.26);
    expect(result.loanAmount).toBe(50000);
    expect(result.maxEligibleAmount).toBe(50000);

    // Not money words — must pass through unconverted.
    expect(result.tenureMonths).toBe(12);
    expect(result.interestRate).toBe(14);
  });

  test('all 5 CDL spec cases round-trip to the exact expected rupee values', () => {
    const cases: { wire: Record<string, number>; expected: Record<string, number> }[] = [
      {
        wire: { emi: 116667, totalInterest: 0, totalAmount: 700000 },
        expected: { emi: 1166.67, totalInterest: 0, totalAmount: 7000 },
      },
      {
        wire: { emi: 62851, totalInterest: 54210, totalAmount: 754210 },
        expected: { emi: 628.51, totalInterest: 542.1, totalAmount: 7542.1 },
      },
      {
        wire: { emi: 448936, totalInterest: 387226, totalAmount: 5387226 },
        expected: { emi: 4489.36, totalInterest: 3872.26, totalAmount: 53872.26 },
      },
      {
        wire: { emi: 1740339, totalInterest: 442028, totalAmount: 10442028 },
        expected: { emi: 17403.39, totalInterest: 4420.28, totalAmount: 104420.28 },
      },
      {
        wire: { emi: 893173, totalInterest: 718072, totalAmount: 10718072 },
        expected: { emi: 8931.73, totalInterest: 7180.72, totalAmount: 107180.72 },
      },
    ];

    for (const { wire, expected } of cases) {
      expect(convertMoneyFieldsFromPaise(wire)).toEqual(expected);
    }
  });

  test('nested objects and arrays are converted recursively', () => {
    const wire = {
      loan: { emi: 448936, tenureMonths: 12 },
      schedule: [{ emiAmount: 448936, emiNumber: 1 }, { emiAmount: 448936, emiNumber: 2 }],
    };
    const result = convertMoneyFieldsFromPaise(wire) as {
      loan: { emi: number; tenureMonths: number };
      schedule: { emiAmount: number; emiNumber: number }[];
    };
    expect(result.loan.emi).toBe(4489.36);
    expect(result.loan.tenureMonths).toBe(12);
    expect(result.schedule[0]!.emiAmount).toBe(4489.36);
    expect(result.schedule[0]!.emiNumber).toBe(1);
  });

  test('categorical string fields that happen to contain a money word are left alone', () => {
    // normalBalance: 'DEBIT' | 'CREDIT' — a real field elsewhere in the app;
    // "balance" is a money word, but the value isn't numeric.
    const wire = { normalBalance: 'DEBIT' };
    const result = convertMoneyFieldsFromPaise(wire) as { normalBalance: string };
    expect(result.normalBalance).toBe('DEBIT');
  });

  test('null and undefined pass through unchanged', () => {
    expect(convertMoneyFieldsFromPaise(null)).toBeNull();
    expect(convertMoneyFieldsFromPaise(undefined)).toBeUndefined();
    expect(convertMoneyFieldsFromPaise({ emi: null })).toEqual({ emi: null });
  });
});
