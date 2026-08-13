// src/middlewares/moneyConverter.middleware.ts
// Global response interceptor — converts money fields from rupees to paise.
// This runs after every controller before sending response to client.
//
// Detection is now two-layered, not a single fixed list of literal names:
//
// 1. PRIMARY signal — the value's actual type. Every money column in the
//    schema is Decimal(15,2) (see CHECK constraints added earlier), so any
//    Prisma.Decimal value is treated as money and converted, regardless of
//    field name. A brand-new money column added to the schema is caught
//    automatically, with no middleware change required.
//
// 2. SECONDARY signal — the *words* in the key, for values that never reach
//    the client as Decimal. This covers both our own calculator output (EMI,
//    foreclosure, cooling-off return plain JS `number`) and, importantly,
//    every repository mapper: they call toNumber() on each Decimal column, so
//    by the time a response is serialised the primary signal above has
//    already been erased and the key is all that is left to go on.
//
// This replaces the previous approach of a single hardcoded Set of ~34
// literal field names, which silently skipped conversion for any money
// field that wasn't manually added to the list — a real, dangerous class
// of bug (a forgotten field passes through as rupees while the client
// expects paise, silently misreporting amounts by 100x).
//
// The word matching is whole-word and case-insensitive, because the previous
// regex anchored each money word to the start of the key (or to an
// underscore) and was case-sensitive. That matched `amountRequested` but not
// `approvedAmount`, `monthlyEmi`, `processingFee`, `monthlyIncome` or
// `outstandingBalance` — the exact bug class described above, reintroduced by
// the detection rule itself. Those fields reached the dashboard as rupees
// while it divided them by 100, so an approved loan rendered at 1/100th of
// its value. Conversely `emiNumber` (an EMI's 1..n sequence position) *did*
// match and was multiplied by 100; NON_MONEY_WORDS now excludes it.

import type { Request, Response, NextFunction } from 'express';
import { Prisma } from '@/generated/prisma-client';

// A key holds money when one of these appears in it as a whole word.
//
// Deliberately small — adding a word here changes the wire format of every
// endpoint that returns it, so a new entry needs the same consumer audit a
// contract change gets.
const MONEY_WORDS = new Set([
    'amount', 'fee', 'emi', 'balance', 'income', 'interest', 'principal',
]);

// Words that disqualify a key even when a money word sits next to them:
// rates and percentages (interestRate, processingFeePct, foreclosureFeePct),
// counts and sequence numbers (overdueEmiCount, emiNumber), timestamps
// (firstEmiDate, nextEmiDate), and fields whose name already declares their
// unit (loanAmountRupees, processingFeeRupees). The categorical entries
// (status/type/mode/flag/id) are defensive: no such key carries a money word
// today, and none should start silently converting if one ever does.
const NON_MONEY_WORDS = new Set([
    'rate', 'rates', 'pct', 'percent', 'percentage', 'ratio',
    'count', 'counts', 'number', 'num', 'index',
    'date', 'dates', 'at', 'day', 'days',
    'id', 'ids', 'status', 'type', 'mode', 'flag',
    'rupees', 'paise',
]);

// Splits camelCase and snake_case alike into lowercase words, so a money word
// is recognised wherever it sits in the name rather than only at the start:
// `approvedAmount`, `approved_amount` and `amountRequested` all yield a word
// list containing 'amount'. The second replace keeps acronym boundaries
// intact — `processingFeeGST` → ['processing', 'fee', 'gst'].
function splitWords(key: string): string[] {
    return key
        .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
        .replace(/([A-Z]+)([A-Z][a-z])/g, '$1_$2')
        .toLowerCase()
        .split('_')
        .filter(Boolean);
}

function looksLikeMoneyKey(key: string): boolean {
    const words = splitWords(key);
    if (words.some((w) => NON_MONEY_WORDS.has(w))) return false;
    return words.some((w) => MONEY_WORDS.has(w));
}

// Only strings that are actually numeric are money. A money *word* can appear
// in the key of a categorical string field — `normalBalance` is 'DEBIT' |
// 'CREDIT' — and parseFloat would turn those into NaN on the wire.
const NUMERIC_STRING = /^-?\d+(\.\d+)?$/;

function rupeesToPaise(value: unknown): number {
    if (value === null || value === undefined) return 0;
    if (value instanceof Prisma.Decimal) return Math.round(Number(value.toString()) * 100);
    if (typeof value === 'string') return Math.round(parseFloat(value) * 100);
    if (typeof value === 'number') return Math.round(value * 100);
    return 0;
}

function convertMoneyFields(obj: any): any {
    if (obj === null || obj === undefined) return obj;
    if (Array.isArray(obj)) return obj.map(convertMoneyFields);
    if (obj instanceof Prisma.Decimal) return rupeesToPaise(obj);
    if (obj instanceof Date) return obj;
    if (typeof obj !== 'object') return obj;

    const result: any = {};
    for (const key of Object.keys(obj)) {
        const value = obj[key];

        const isDecimal = value instanceof Prisma.Decimal;
        const isPlainMoneyLike =
            (typeof value === 'number' ||
                (typeof value === 'string' && NUMERIC_STRING.test(value.trim()))) &&
            looksLikeMoneyKey(key);

        if ((isDecimal || isPlainMoneyLike) && value !== null && value !== undefined) {
            result[key] = rupeesToPaise(value);
        } else if (typeof value === 'object' && value !== null) {
            result[key] = convertMoneyFields(value);
        } else {
            result[key] = value;
        }
    }
    return result;
}

export function moneyConverterMiddleware() {
    return (req: Request, res: Response, next: NextFunction) => {
        const originalJson = res.json.bind(res);
        res.json = (body: any) => {
            const converted = convertMoneyFields(body);
            return originalJson(converted);
        };
        next();
    };
}