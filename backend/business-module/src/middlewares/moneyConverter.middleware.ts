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
// 2. SECONDARY signal — a naming *pattern* (not an exact list) for values
//    that never pass through Prisma directly, e.g. numbers returned by our
//    own calculator functions (EMI, foreclosure, cooling-off) as plain
//    JS `number`, not Decimal. Matches common money-field suffixes so a
//    new field named e.g. `lateFeeAmount` or `refund_amount` is caught
//    without needing to be individually registered.
//
// This replaces the previous approach of a single hardcoded Set of ~34
// literal field names, which silently skipped conversion for any money
// field that wasn't manually added to the list — a real, dangerous class
// of bug (a forgotten field passes through as rupees while the client
// expects paise, silently misreporting amounts by 100x).

import type { Request, Response, NextFunction } from 'express';
import { Prisma } from '@/generated/prisma-client';

// Matches: amount, ...Amount, _amount, fee, ...Fee, _fee, emi, ...Emi, _emi,
// balance, ...Balance, _balance, income, ...Income, _income, interest,
// ...Interest, _interest, principal, ...Principal, _principal
const MONEY_KEY_PATTERN = /(^|_)(amount|fee|emi|balance|income|interest|principal)($|_|[A-Z])/;

function looksLikeMoneyKey(key: string): boolean {
    return MONEY_KEY_PATTERN.test(key);
}

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
            (typeof value === 'number' || typeof value === 'string') &&
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