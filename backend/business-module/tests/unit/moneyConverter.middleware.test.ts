// tests/unit/moneyConverter.middleware.test.ts
//
// Locks the rupees→paise wire contract.
//
// The middleware's previous key rule anchored each money word to the start of
// the key and was case-sensitive: `amountRequested` converted, `approvedAmount`
// did not. Both sit in the same GET /applications row, so the dashboard — which
// divides every money field by 100 — rendered an approved loan at 1/100th of
// its value while the requested amount was correct. The same gap hit
// `monthlyEmi`, `processingFee`, `monthlyIncome` and `outstandingBalance`
// (LMS + NACH screens), and in the other direction `emiNumber` — an EMI's 1..n
// position — matched the pattern and was multiplied by 100.
//
// These tests are the contract, not the implementation: each case names a real
// response field and the unit the client is entitled to receive.

import type { Request, Response, NextFunction } from 'express';
import { moneyConverterMiddleware } from '@/middlewares/moneyConverter.middleware';
import { Prisma } from '@/generated/prisma-client';

/** Runs a payload through the middleware and returns what res.json() emitted. */
function send(body: unknown): any {
    let captured: unknown;
    const res = { json: (b: unknown) => { captured = b; return res; } } as unknown as Response;

    moneyConverterMiddleware()({} as Request, res, (() => undefined) as NextFunction);
    res.json(body);

    return captured;
}

describe('moneyConverterMiddleware', () => {
    describe('every money field in a GET /applications row reaches the client in paise', () => {
        // The regression: these five travel together and must share one unit.
        it('converts requested, approved, EMI, fee and income alike', () => {
            const out = send({
                amountRequested: 50000,
                approvedAmount: 45000,
                monthlyEmi: 4212.5,
                processingFee: 1125,
                processingFeeGst: 202.5,
                monthlyIncome: 38000,
            });

            expect(out).toEqual({
                amountRequested: 5_000_000,
                approvedAmount: 4_500_000,
                monthlyEmi: 421_250,
                processingFee: 112_500,
                processingFeeGst: 20_250,
                monthlyIncome: 3_800_000,
            });
        });

        it('converts the LMS and NACH money fields', () => {
            expect(send({
                principalAmount: 45000,
                outstandingBalance: 31500,
                overdueAmount: 8425,
                totalAmount: 120000,
                successAmount: 90000,
                failedAmount: 30000,
                maxAmount: 200000,
            })).toEqual({
                principalAmount: 4_500_000,
                outstandingBalance: 3_150_000,
                overdueAmount: 842_500,
                totalAmount: 12_000_000,
                successAmount: 9_000_000,
                failedAmount: 3_000_000,
                maxAmount: 20_000_000,
            });
        });

        it('reads money words in snake_case keys too', () => {
            expect(send({ approved_amount: 45000, monthly_emi: 4212.5 }))
                .toEqual({ approved_amount: 4_500_000, monthly_emi: 421_250 });
        });

        it('converts a Prisma.Decimal whatever the key is named', () => {
            expect(send({ someUnnamedColumn: new Prisma.Decimal('1234.56') }))
                .toEqual({ someUnnamedColumn: 123_456 });
        });

        it('converts numeric strings', () => {
            expect(send({ approvedAmount: '45000.50' })).toEqual({ approvedAmount: 4_500_050 });
        });
    });

    describe('leaves non-money values alone even when the key contains a money word', () => {
        it('does not convert rates or percentages', () => {
            expect(send({
                interestRate: 18.5,
                processingFeePct: 2.5,
                foreclosureFeePct: 4,
                recommendedInterestRate: 16,
            })).toEqual({
                interestRate: 18.5,
                processingFeePct: 2.5,
                foreclosureFeePct: 4,
                recommendedInterestRate: 16,
            });
        });

        // emiNumber is an EMI's position in the schedule. The old rule matched it
        // and EMI #3 went out as 300.
        it('does not convert counts or sequence numbers', () => {
            expect(send({ emiNumber: 3, overdueEmiCount: 2, totalEmis: 24, paidEmis: 7 }))
                .toEqual({ emiNumber: 3, overdueEmiCount: 2, totalEmis: 24, paidEmis: 7 });
        });

        it('does not convert date-valued fields', () => {
            const due = new Date('2026-03-15T00:00:00.000Z');
            const out = send({ firstEmiDate: due, nextEmiDate: due, lastPaidAt: due });

            expect(out.firstEmiDate).toBe(due);
            expect(out.nextEmiDate).toBe(due);
            expect(out.lastPaidAt).toBe(due);
        });

        // 'DEBIT' | 'CREDIT'. Treating it as money parses to NaN, which
        // serialises as null and silently empties the field.
        it('does not convert categorical strings', () => {
            expect(send({ normalBalance: 'DEBIT' })).toEqual({ normalBalance: 'DEBIT' });
        });

        // The name declares the unit; converting would double-apply it.
        it('does not convert fields explicitly named as rupees', () => {
            expect(send({ loanAmountRupees: 45000, processingFeeRupees: 1125 }))
                .toEqual({ loanAmountRupees: 45000, processingFeeRupees: 1125 });
        });

        // lms.api.ts consumes this as rupees by name and documents it as such.
        it('leaves outstandingAfter in rupees, as the LMS client expects', () => {
            expect(send({ outstandingAfter: 31500 })).toEqual({ outstandingAfter: 31500 });
        });

        it('preserves null rather than coercing it to zero', () => {
            // The dashboard falls back with `approvedAmount ?? amountRequested`,
            // which a 0 would defeat.
            expect(send({ approvedAmount: null, monthlyEmi: undefined }))
                .toEqual({ approvedAmount: null, monthlyEmi: undefined });
        });
    });

    describe('walks the whole payload', () => {
        it('converts inside nested objects and arrays', () => {
            const out = send({
                data: [
                    { id: 'a', approvedAmount: 45000, customer: { monthlyIncome: 38000 } },
                    { id: 'b', approvedAmount: 60000, customer: { monthlyIncome: 52000 } },
                ],
                meta: { page: 1, pageSize: 20, total: 2 },
            });

            expect(out.data[0].approvedAmount).toBe(4_500_000);
            expect(out.data[0].customer.monthlyIncome).toBe(3_800_000);
            expect(out.data[1].approvedAmount).toBe(6_000_000);
            // Pagination counters share no vocabulary with money.
            expect(out.meta).toEqual({ page: 1, pageSize: 20, total: 2 });
        });

        it('passes through payloads with no money at all', () => {
            expect(send({ success: true, message: 'ok' }))
                .toEqual({ success: true, message: 'ok' });
        });
    });
});
