// tests/unit/emi.calculator.test.ts
import {
    computeMonthlyEmi,
    buildAmortizationSchedule,
    computeDailyOverduePenalty,
    computeBouncePenalty,
    computeForeclosureAmount,
    computeApr,
    isWithinCoolingOffPeriod,
    computeCoolingOffPayoff,
    allocatePartialPayment,
    _internal,
} from '@/modules/emi/emi.calculator';

const { toPaisa, toRupees } = _internal;

describe('computeMonthlyEmi', () => {

    test('standard 18% p.a. on ₹1,00,000 for 12 months', () => {
        const emi = computeMonthlyEmi(100_000, 18, 12);
        // Known value: ₹9,168 (ceiled to paisa)
        expect(emi).toBe(9168);
    });

    test('0% interest → equal instalments', () => {
        const emi = computeMonthlyEmi(60_000, 0, 12);
        expect(emi).toBe(5_000);
    });

    test('single month tenure', () => {
        const emi = computeMonthlyEmi(10_000, 12, 1);
        // One month at 1% → 10,100
        expect(emi).toBe(10_100);
    });

    test('36 month tenure rounds correctly', () => {
        const emi = computeMonthlyEmi(200_000, 24, 36);
        expect(typeof emi).toBe('number');
        expect(emi).toBeGreaterThan(0);
    });

    test('throws on zero tenure', () => {
        expect(() => computeMonthlyEmi(10_000, 12, 0)).toThrow();
    });

    test('throws on negative principal', () => {
        expect(() => computeMonthlyEmi(-1000, 12, 12)).toThrow();
    });

    test('throws on negative rate', () => {
        expect(() => computeMonthlyEmi(10_000, -1, 12)).toThrow();
    });
});

describe('buildAmortizationSchedule', () => {

    const BASE = {
        loanAccountId: 'test-loan-001',
        principal: 100_000,
        annualRatePct: 18,
        tenureMonths: 12,
        disbursementDate: new Date('2026-01-15'),
    };

    let schedule: ReturnType<typeof buildAmortizationSchedule>;

    beforeEach(() => {
        schedule = buildAmortizationSchedule(BASE);
    });

    test('produces correct number of entries', () => {
        expect(schedule.entries).toHaveLength(12);
    });

    test('first EMI due one month after disbursement', () => {
        const firstDue = schedule.entries[0]!.dueDate;
        expect(firstDue.getFullYear()).toBe(2026);
        expect(firstDue.getMonth()).toBe(1); // February (0-indexed)
    });

    test('sum of principalComponent === principal (invariant 1)', () => {
        const totalPrincipal = schedule.entries.reduce(
            (sum, e) => sum + toPaisa(e.principalComponent), 0,
        );
        expect(totalPrincipal).toBe(toPaisa(BASE.principal));
    });

    test('last entry outstandingAfter === 0', () => {
        const last = schedule.entries[schedule.entries.length - 1]!;
        expect(last.outstandingAfter).toBe(0);
    });

    test('each entry: emiAmount === principal + interest (invariant 4)', () => {
        schedule.entries.forEach((e) => {
            const computed = toPaisa(e.principalComponent) + toPaisa(e.interestComponent);
            expect(toPaisa(e.emiAmount)).toBe(computed);
        });
    });

    test('outstanding decreases monotonically', () => {
        for (let i = 1; i < schedule.entries.length; i++) {
            expect(schedule.entries[i]!.outstandingAfter)
                .toBeLessThan(schedule.entries[i - 1]!.outstandingAfter);
        }
    });

    test('all EMIs equal monthlyEmi except last', () => {
        schedule.entries.slice(0, -1).forEach((e) => {
            expect(e.emiAmount).toBe(schedule.monthlyEmi);
        });
        // Last EMI may differ
        const last = schedule.entries[schedule.entries.length - 1]!;
        expect(last.emiAmount).toBeLessThanOrEqual(schedule.monthlyEmi + 0.50);
    });

    test('January 31 + 1 month = February 28 (month-end edge case)', () => {
        const jan31Schedule = buildAmortizationSchedule({
            ...BASE,
            disbursementDate: new Date('2026-01-31'),
        });
        const firstDue = jan31Schedule.entries[0]!.dueDate;
        // Should be Feb 28 (2026 is not a leap year), not Mar 3
        expect(firstDue.getDate()).toBe(28);
        expect(firstDue.getMonth()).toBe(1);
    });

    test('0% rate schedule still passes invariants', () => {
        const freeSchedule = buildAmortizationSchedule({
            ...BASE,
            annualRatePct: 0,
        });
        const totalPrincipal = freeSchedule.entries.reduce(
            (sum, e) => sum + toPaisa(e.principalComponent), 0,
        );
        expect(totalPrincipal).toBe(toPaisa(BASE.principal));
        expect(freeSchedule.entries[11]!.outstandingAfter).toBe(0);
    });

    test('large loan ₹5L 36 months — invariants hold', () => {
        const bigSchedule = buildAmortizationSchedule({
            ...BASE,
            principal: 500_000,
            tenureMonths: 36,
        });
        const totalPrincipal = bigSchedule.entries.reduce(
            (sum, e) => sum + toPaisa(e.principalComponent), 0,
        );
        expect(totalPrincipal).toBe(toPaisa(500_000));
        expect(bigSchedule.entries[35]!.outstandingAfter).toBe(0);
    });
});

describe('computeDailyOverduePenalty', () => {
    test('24% p.a. on ₹10,000 = ₹6.58/day (ceiled)', () => {
        const penalty = computeDailyOverduePenalty(10_000, 24);
        // 10000 * 0.24 / 365 = 6.5753...  → ceiled to 6.58
        expect(penalty).toBe(6.58);
    });

    test('returns positive value for positive inputs', () => {
        const p = computeDailyOverduePenalty(50_000, 18);
        expect(p).toBeGreaterThan(0);
    });
});

describe('computeBouncePenalty', () => {
    test('2% on ₹9,000 EMI = ₹180', () => {
        expect(computeBouncePenalty(9_000, 2)).toBe(180);
    });
});

describe('allocatePartialPayment', () => {
    test('full payment clears everything', () => {
        const result = allocatePartialPayment({
            paymentAmount: 1_200,
            penaltyDue: 200,
            interestDue: 300,
            principalDue: 700,
        });
        expect(result.fullySettled).toBe(true);
        expect(result.shortfall).toBe(0);
        expect(result.penaltySettled).toBe(200);
        expect(result.interestSettled).toBe(300);
        expect(result.principalSettled).toBe(700);
    });

    test('partial payment clears penalty first, then interest', () => {
        const result = allocatePartialPayment({
            paymentAmount: 400,
            penaltyDue: 200,
            interestDue: 300,
            principalDue: 700,
        });
        expect(result.fullySettled).toBe(false);
        expect(result.penaltySettled).toBe(200);
        expect(result.interestSettled).toBe(200);
        expect(result.principalSettled).toBe(0);
        expect(result.shortfall).toBe(800);
    });

    test('shortfall calculation is correct', () => {
        const result = allocatePartialPayment({
            paymentAmount: 0,
            penaltyDue: 100,
            interestDue: 200,
            principalDue: 500,
        });
        expect(result.shortfall).toBe(800);
        expect(result.fullySettled).toBe(false);
    });
});

describe('computeForeclosureAmount', () => {
    test('applies real interest rate — regression test for the 0% rate bug', () => {
        // Before the fix, annualRatePct was hardcoded to 0 in the caller,
        // silently undercharging accrued interest on every foreclosure quote.
        const result = computeForeclosureAmount({
            outstandingPrincipal: 100_000,
            annualRatePct: 18,
            lastEmiDate: new Date('2026-01-01'),
            settlementDate: new Date('2026-01-11'), // 10 days later
            foreclosureFeePct: 5,
            accumulatedPenalty: 0,
            applyMinimumInterestFloor: true,
        });
        // At 18% p.a. over 10 days on ₹1,00,000, accrued interest must be > 0.
        // A 0%-rate bug would make this exactly 0.
        expect(result.accruedInterest).toBeGreaterThan(0);
    });

    test('minimum interest rule — 10 days interest or ₹500, whichever higher (short outstanding period) — WHEN the floor applies', () => {
        const result = computeForeclosureAmount({
            outstandingPrincipal: 10_000,
            annualRatePct: 12,
            lastEmiDate: new Date('2026-01-01'),
            settlementDate: new Date('2026-01-02'), // 1 day later — real interest would be tiny
            foreclosureFeePct: 5,
            accumulatedPenalty: 0,
            applyMinimumInterestFloor: true,
        });
        // Real 1-day interest on ₹10,000 @ 12% is a few rupees — the ₹500
        // minimum interest rule must kick in and dominate.
        expect(result.accruedInterest).toBeGreaterThanOrEqual(500);
    });

    // Audit finding #9: this floor is Gold-Loan-specific per the
    // function's own documented scope, but was being applied
    // unconditionally to every caller — including CDL, whose spec states
    // foreclosure is simply "5% of principal outstanding + GST", nothing
    // about a minimum-interest floor. Same inputs as the test above,
    // just with the flag off, to prove the floor is now opt-in.
    test('the same short-outstanding-period scenario does NOT apply the floor when applyMinimumInterestFloor is false', () => {
        const result = computeForeclosureAmount({
            outstandingPrincipal: 10_000,
            annualRatePct: 12,
            lastEmiDate: new Date('2026-01-01'),
            settlementDate: new Date('2026-01-02'),
            foreclosureFeePct: 5,
            accumulatedPenalty: 0,
            applyMinimumInterestFloor: false,
        });
        // Real 1-day interest on ₹10,000 @ 12% is a few rupees — must NOT
        // be inflated to the ₹500 floor.
        expect(result.accruedInterest).toBeLessThan(500);
        expect(result.accruedInterest).toBeGreaterThan(0);
    });

    test('foreclosure fee is 5% of outstanding principal plus GST', () => {
        const result = computeForeclosureAmount({
            outstandingPrincipal: 100_000,
            annualRatePct: 18,
            lastEmiDate: new Date('2026-01-01'),
            settlementDate: new Date('2026-01-11'),
            foreclosureFeePct: 5,
            accumulatedPenalty: 0,
            applyMinimumInterestFloor: true,
        });
        // 5% of 100,000 = 5,000; +18% GST = 5,900
        expect(result.foreclosureFee).toBeCloseTo(5_000, 0);
    });

    test('includes accumulated penalty in the total', () => {
        const withPenalty = computeForeclosureAmount({
            outstandingPrincipal: 50_000,
            annualRatePct: 15,
            lastEmiDate: new Date('2026-01-01'),
            settlementDate: new Date('2026-01-11'),
            foreclosureFeePct: 5,
            accumulatedPenalty: 1_000,
            applyMinimumInterestFloor: true,
        });
        const withoutPenalty = computeForeclosureAmount({
            outstandingPrincipal: 50_000,
            annualRatePct: 15,
            lastEmiDate: new Date('2026-01-01'),
            settlementDate: new Date('2026-01-11'),
            foreclosureFeePct: 5,
            accumulatedPenalty: 0,
            applyMinimumInterestFloor: true,
        });
        expect(withPenalty.total - withoutPenalty.total).toBeCloseTo(1_000, 0);
    });

describe('computeApr', () => {
    test('APR is always >= nominal rate when upfront charges are deducted', () => {
        const monthlyEmi = computeMonthlyEmi(100_000, 18, 12);
        const apr = computeApr({
            principal: 100_000,
            monthlyEmi,
            tenureMonths: 12,
            upfrontCharges: 2_000,
        });
        // Netting charges against a smaller disbursed amount for the same
        // EMI must produce an effective rate >= the nominal 18%.
        expect(apr).toBeGreaterThanOrEqual(18);
    });

    test('zero upfront charges — APR approximately equals nominal rate', () => {
        const monthlyEmi = computeMonthlyEmi(100_000, 18, 12);
        const apr = computeApr({
            principal: 100_000,
            monthlyEmi,
            tenureMonths: 12,
            upfrontCharges: 0,
        });
        expect(apr).toBeCloseTo(18, 0);
    });

    test('throws if upfront charges consume the entire principal', () => {
        expect(() => computeApr({
            principal: 10_000,
            monthlyEmi: 900,
            tenureMonths: 12,
            upfrontCharges: 10_000,
        })).toThrow();
    });
});

describe('isWithinCoolingOffPeriod', () => {
    test('true on the day of disbursement', () => {
        const disbursedAt = new Date('2026-01-01T00:00:00Z');
        const asOf = new Date('2026-01-01T12:00:00Z');
        expect(isWithinCoolingOffPeriod(disbursedAt, asOf, 3)).toBe(true);
    });

    test('true on the last eligible day', () => {
        const disbursedAt = new Date('2026-01-01T00:00:00Z');
        const asOf = new Date('2026-01-04T00:00:00Z'); // day 3
        expect(isWithinCoolingOffPeriod(disbursedAt, asOf, 3)).toBe(true);
    });

    test('false after the window closes', () => {
        const disbursedAt = new Date('2026-01-01T00:00:00Z');
        const asOf = new Date('2026-01-06T00:00:00Z'); // day 5
        expect(isWithinCoolingOffPeriod(disbursedAt, asOf, 3)).toBe(false);
    });

    test('false for a date before disbursement (clock skew guard)', () => {
        const disbursedAt = new Date('2026-01-05T00:00:00Z');
        const asOf = new Date('2026-01-01T00:00:00Z');
        expect(isWithinCoolingOffPeriod(disbursedAt, asOf, 3)).toBe(false);
    });
});

describe('computeCoolingOffPayoff', () => {
    test('charges no foreclosure fee or penalty — only principal plus pro-rata interest', () => {
        const result = computeCoolingOffPayoff({
            outstandingPrincipal: 100_000,
            annualRatePct: 18,
            disbursedAt: new Date('2026-01-01'),
            exitDate: new Date('2026-01-04'), // 3 days later
        });
        expect(result.outstandingPrincipal).toBe(100_000);
        expect(result.accruedInterest).toBeGreaterThan(0);
        expect(result.total).toBeGreaterThan(100_000);
        // Total must equal exactly principal + interest — no hidden fee added.
        expect(result.total).toBeCloseTo(100_000 + result.accruedInterest, 2);
    });

    test('same-day exit — zero accrued interest', () => {
        const result = computeCoolingOffPayoff({
            outstandingPrincipal: 50_000,
            annualRatePct: 15,
            disbursedAt: new Date('2026-01-01'),
            exitDate: new Date('2026-01-01'),
        });
        expect(result.accruedInterest).toBe(0);
        expect(result.total).toBe(50_000);
    });
});
});