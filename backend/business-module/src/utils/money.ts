// src/utils/money.ts
// Money conversion utilities
// DB stores as numeric (rupees with 2 decimals)
// API exchanges in paise (₹1 = 100 paise)

import { Prisma } from '@prisma/client';

type MoneyInput = number | string | Prisma.Decimal | null | undefined;

/**
 * Convert rupees (from DB) → paise (for API response)
 * Example: 50000.00 → 5000000
 */
export const rupeesToPaise = (rupees: MoneyInput): number => {
    if (rupees === null || rupees === undefined) return 0;
    const num = typeof rupees === 'object' ? Number(rupees.toString()) : Number(rupees);
    return Math.round(num * 100);
};

/**
 * Convert paise (from API request) → rupees (for DB storage)
 * Example: 5000000 → 50000
 */
export const paiseToRupees = (paise: number | string | null | undefined): number => {
    if (paise === null || paise === undefined) return 0;
    const num = typeof paise === 'string' ? parseInt(paise, 10) : Number(paise);
    return num / 100;
};

/**
 * Serialize a money field for API response
 */
export const serializeMoney = (rupees: MoneyInput): number => rupeesToPaise(rupees);

/**
 * Parse incoming money from API (paise) → DB format (rupees)
 */
export const parseMoney = (paise: number | string | null | undefined): number => paiseToRupees(paise);