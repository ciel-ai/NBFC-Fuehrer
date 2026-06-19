// src/middlewares/moneyConverter.middleware.ts
// Global response interceptor — converts money fields from rupees to paise
// This runs after every controller before sending response to client.

import type { Request, Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';

// List of field names that should be converted to paise
const MONEY_FIELDS = new Set([
    'amount',
    'amount_requested',
    'amountRequested',
    'approved_amount',
    'approvedAmount',
    'monthly_emi',
    'monthlyEmi',
    'monthly_income',
    'monthlyIncome',
    'processing_fee',
    'processingFee',
    'processing_fee_gst',
    'processingFeeGst',
    'principal_amount',
    'principalAmount',
    'outstanding_balance',
    'outstandingBalance',
    'total_interest',
    'totalInterest',
    'emi_amount',
    'emiAmount',
    'principal_component',
    'principalComponent',
    'interest_component',
    'interestComponent',
    'penalty_amount',
    'penaltyAmount',
    'overdue_amount',
    'overdueAmount',
    'ptp_amount',
    'ptpAmount',
    'total_amount',
    'totalAmount',
    'net_disbursed_amount',
    'netDisbursedAmount',
    'max_amount',
    'maxAmount',
    'max_eligible_amount',
    'maxEligibleAmount',
    'recommended_amount',
    'recommendedAmount',
    'requested_emi',
    'requestedEmi',
    'existing_emi_per_month',
    'existingEmiPerMonth',
    'paid_amount',
    'paidAmount',
]);

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
    if (typeof obj !== 'object') return obj;
    if (obj instanceof Date) return obj;

    const result: any = {};
    for (const key of Object.keys(obj)) {
        const value = obj[key];
        if (MONEY_FIELDS.has(key) && value !== null && value !== undefined) {
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