// tests/unit/cdlLoans.quote.test.ts
//
// Coverage for the CDL EMI/total-payable audit: the pre-application quote
// (cdlLoansService.quote, exposed at GET /consumer-durable-loans/quote and
// GET /sales/cdl/quote) must be the same authoritative calculation the loan
// is actually booked and disbursed at — no second formula, and no
// `emi * tenureMonths` shortcut for totalPayable/totalInterest (that
// shortcut silently disagrees with the real schedule once the final
// installment absorbs a rounding residual).

import { cdlLoansService, CDL_INTEREST_RATES } from '@/modules/cdlLoans/cdlLoans.service';
import { cdlQuoteSchema } from '@/modules/cdlLoans/cdlLoans.dto';
import { buildAmortizationSchedule } from '@/modules/emi/emi.calculator';
import { ValidationError } from '@/errors';

const OPTS = { abortEarly: false, stripUnknown: true, convert: true };

function baseInput(overrides: Partial<Parameters<typeof cdlLoansService.quote>[0]> = {}) {
    return {
        productValue: 200000,
        downPayment: 0,
        loanAmount: 50000,
        tenureMonths: 12,
        employmentType: 'SALARIED' as const,
        interestRate: 14,
        ...overrides,
    };
}

/** Independently computes the expected schedule totals for comparison. */
function expectedTotals(loanAmount: number, interestRate: number, tenureMonths: number) {
    const schedule = buildAmortizationSchedule({
        loanAccountId: 'test',
        principal: loanAmount,
        annualRatePct: interestRate,
        tenureMonths,
        disbursementDate: new Date('2026-01-01'),
    });
    return {
        emi: schedule.monthlyEmi,
        totalInterest: schedule.totalInterest,
        totalPayable: schedule.totalPayable,
    };
}

describe('cdlLoansService.quote — the 5 spec test cases', () => {
    const cases: { name: string; loanAmount: number; tenureMonths: number; interestRate: number; employmentType: 'SALARIED' | 'SELF_EMPLOYED' }[] = [
        { name: 'CASE 1', loanAmount: 7000,   tenureMonths: 6,  interestRate: 0,  employmentType: 'SALARIED' },
        { name: 'CASE 2', loanAmount: 7000,   tenureMonths: 12, interestRate: 14, employmentType: 'SALARIED' },
        { name: 'CASE 3', loanAmount: 50000,  tenureMonths: 12, interestRate: 14, employmentType: 'SALARIED' },
        { name: 'CASE 4', loanAmount: 100000, tenureMonths: 6,  interestRate: 15, employmentType: 'SELF_EMPLOYED' },
        { name: 'CASE 5', loanAmount: 100000, tenureMonths: 12, interestRate: 13, employmentType: 'SALARIED' },
    ];

    test.each(cases)(
        '$name: ₹$loanAmount / $tenureMonths mo / $interestRate% ($employmentType) — quote matches the actual schedule',
        ({ loanAmount, tenureMonths, interestRate, employmentType }) => {
            const result = cdlLoansService.quote(baseInput({
                loanAmount, tenureMonths, interestRate, employmentType,
                productValue: loanAmount,
            }));
            const expected = expectedTotals(loanAmount, interestRate, tenureMonths);

            expect(result.emi).toBe(expected.emi);
            expect(result.totalInterest).toBe(expected.totalInterest);
            expect(result.totalAmount).toBe(expected.totalPayable);

            // The bug this closes: totalAmount must be the sum of the
            // actual schedule installments (the authoritative definition),
            // not `emi * tenureMonths` — which can silently disagree once
            // the final installment absorbs the rounding residual.
            const schedule = buildAmortizationSchedule({
                loanAccountId: 'test',
                principal: loanAmount,
                annualRatePct: interestRate,
                tenureMonths,
                disbursementDate: new Date('2026-01-01'),
            });
            const sumOfEntries = Math.round(
                schedule.entries.reduce((sum, e) => sum + e.emiAmount * 100, 0),
            ) / 100;
            expect(result.totalAmount).toBe(sumOfEntries);

            const sumOfInterest = Math.round(
                schedule.entries.reduce((sum, e) => sum + e.interestComponent * 100, 0),
            ) / 100;
            expect(result.totalInterest).toBe(sumOfInterest);
        },
    );

    test('processingFee and processingFeeGst come from the shared CDL fee logic, not a second calculator', () => {
        const result = cdlLoansService.quote(baseInput({ loanAmount: 50000, productValue: 50000 }));
        // Tier for ₹25,001–₹50,000 per CDL_PROCESSING_FEE_TIERS.
        expect(result.processingFee).toBe(1817);
        expect(result.processingFeeGst).toBe(Math.round(1817 * 0.18));
    });
});

describe('cdlLoansService.quote — boundaries', () => {
    test('loanAmount ₹6,999 is rejected', () => {
        expect(() => cdlLoansService.quote(baseInput({ loanAmount: 6999, productValue: 6999 })))
            .toThrow(ValidationError);
    });
    test('loanAmount ₹7,000 is accepted', () => {
        expect(() => cdlLoansService.quote(baseInput({ loanAmount: 7000, productValue: 7000 })))
            .not.toThrow();
    });
    test('loanAmount ₹1,00,000 is accepted', () => {
        expect(() => cdlLoansService.quote(baseInput({ loanAmount: 100000, productValue: 100000 })))
            .not.toThrow();
    });
    test('loanAmount ₹1,00,001 is rejected', () => {
        expect(() => cdlLoansService.quote(baseInput({ loanAmount: 100001, productValue: 100001 })))
            .toThrow(ValidationError);
    });

    test('tenure 5 months is rejected', () => {
        expect(() => cdlLoansService.quote(baseInput({ tenureMonths: 5 }))).toThrow(ValidationError);
    });
    test('tenure 6 months is accepted', () => {
        expect(() => cdlLoansService.quote(baseInput({ tenureMonths: 6 }))).not.toThrow();
    });
    test('tenure 12 months is accepted', () => {
        expect(() => cdlLoansService.quote(baseInput({ tenureMonths: 12 }))).not.toThrow();
    });
    test('tenure 13 months is rejected', () => {
        expect(() => cdlLoansService.quote(baseInput({ tenureMonths: 13 }))).toThrow(ValidationError);
    });

    // Currently-approved CDL rate table (cdlLoans.service.ts CDL_INTEREST_RATES):
    //   SALARIED:      [0, 13, 14]
    //   SELF_EMPLOYED: [0, 14, 15]
    // Asserted against the exported constant, not restated literals, so this
    // test fails loudly (rather than silently passing on a stale table) if
    // the rate table is ever changed without updating it here too.
    test('rate table matches the currently-approved CDL policy', () => {
        expect(CDL_INTEREST_RATES.SALARIED).toEqual([0, 13, 14]);
        expect(CDL_INTEREST_RATES.SELF_EMPLOYED).toEqual([0, 14, 15]);
    });

    test.each([0, 13, 14])('salaried + %d%% is valid', (rate) => {
        expect(() => cdlLoansService.quote(baseInput({ employmentType: 'SALARIED', interestRate: rate })))
            .not.toThrow();
    });
    test('salaried + 15% is rejected (not in the approved salaried table)', () => {
        expect(() => cdlLoansService.quote(baseInput({ employmentType: 'SALARIED', interestRate: 15 })))
            .toThrow(ValidationError);
    });

    test.each([0, 14, 15])('self-employed + %d%% is valid', (rate) => {
        expect(() => cdlLoansService.quote(baseInput({ employmentType: 'SELF_EMPLOYED', interestRate: rate })))
            .not.toThrow();
    });
    test('self-employed + 13% is rejected (not in the approved self-employed table)', () => {
        expect(() => cdlLoansService.quote(baseInput({ employmentType: 'SELF_EMPLOYED', interestRate: 13 })))
            .toThrow(ValidationError);
    });
});

describe('cdlQuoteSchema — request shape (Joi layer, before the service\'s own rate-table check)', () => {
    test('accepts the canonical field set', () => {
        const { error } = cdlQuoteSchema.validate(baseInput(), OPTS);
        expect(error).toBeUndefined();
    });

    // loanAmount has no .min()/.max() in cdlQuoteSchema itself (unlike
    // tenureMonths below) — by this file's own stated design, Joi here
    // catches shape/type, not CDL business bounds; validateCdlLoanParams
    // inside the service owns those (see the 'boundaries' describe block
    // above, which is what actually exercises ₹6,999/₹7,000/etc.). This
    // just confirms the schema still rejects a non-numeric amount.
    test('rejects a non-numeric loanAmount', () => {
        const { error } = cdlQuoteSchema.validate(
            baseInput({ loanAmount: 'not-a-number' as unknown as number }),
            OPTS,
        );
        expect(error).toBeDefined();
    });

    test('rejects a tenure outside 6-12', () => {
        const { error } = cdlQuoteSchema.validate(baseInput({ tenureMonths: 13 }), OPTS);
        expect(error).toBeDefined();
    });

    test('rejects an unknown employmentType', () => {
        const { error } = cdlQuoteSchema.validate(
            baseInput({ employmentType: 'RETIRED' as never }),
            OPTS,
        );
        expect(error).toBeDefined();
    });

    // STUDENT was previously accepted — no longer a supported CDL value,
    // same reasoning as cdlSubmitApplicationSchema (cdlLoans.dto.test.ts).
    test('rejects STUDENT (no longer a supported CDL value)', () => {
        const { error } = cdlQuoteSchema.validate(
            baseInput({ employmentType: 'STUDENT' as never }),
            OPTS,
        );
        expect(error).toBeDefined();
    });

    test('rejects lowercase "salaried"', () => {
        const { error } = cdlQuoteSchema.validate(
            baseInput({ employmentType: 'salaried' as never }),
            OPTS,
        );
        expect(error).toBeDefined();
    });
});
