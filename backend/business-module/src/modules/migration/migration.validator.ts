// src/modules/migration/migration.validator.ts
import { isValidIndianPhone } from '@/utils/phoneNumber.util';
import { normalisePhone } from '@/types/common.types';

// ─── PAN ──────────────────────────────────────────────────────────────────────

const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]$/;

export function isValidPan(pan: string): boolean {
    if (!PAN_REGEX.test(pan)) return false;
    // 4th character encodes entity type — P = individual, H = HUF, B = BOI, etc.
    // For NBFC migration we accept any valid entity type.
    const validEntityChars = new Set(['P', 'H', 'B', 'G', 'J', 'L', 'F', 'A', 'T', 'C']);
    return validEntityChars.has(pan.charAt(3));
}

export function normalisePan(raw: string): string {
    return raw.trim().toUpperCase().replace(/\s/g, '');
}

// ─── Aadhaar (Verhoeff checksum) ──────────────────────────────────────────────

const VERHOEFF_D = [
    [0,1,2,3,4,5,6,7,8,9],
    [1,2,3,4,0,6,7,8,9,5],
    [2,3,4,0,1,7,8,9,5,6],
    [3,4,0,1,2,8,9,5,6,7],
    [4,0,1,2,3,9,5,6,7,8],
    [5,9,8,7,6,0,4,3,2,1],
    [6,5,9,8,7,1,0,4,3,2],
    [7,6,5,9,8,2,1,0,4,3],
    [8,7,6,5,9,3,2,1,0,4],
    [9,8,7,6,5,4,3,2,1,0],
];

const VERHOEFF_P = [
    [0,1,2,3,4,5,6,7,8,9],
    [1,5,7,6,2,8,3,0,9,4],
    [5,8,0,3,7,9,6,1,4,2],
    [8,9,1,6,0,4,3,5,2,7],
    [9,4,5,3,1,2,6,8,7,0],
    [4,2,8,6,5,7,3,9,0,1],
    [2,7,9,3,8,0,6,4,1,5],
    [7,0,4,6,9,1,3,2,5,8],
];

function verhoeffCheck(num: string): boolean {
    let c = 0;
    const digits = num.split('').reverse().map(Number);
    for (let i = 0; i < digits.length; i++) {
        c = VERHOEFF_D[c]![VERHOEFF_P[i % 8]![digits[i]!]!]!;
    }
    return c === 0;
}

export function isValidAadhaar(raw: string): boolean {
    const digits = raw.replace(/\s/g, '');
    if (!/^\d{12}$/.test(digits)) return false;
    if (digits[0] === '0' || digits[0] === '1') return false;
    return verhoeffCheck(digits);
}

export function normaliseAadhaar(raw: string): string {
    return raw.replace(/\s/g, '');
}

// ─── Phone ────────────────────────────────────────────────────────────────────

export function isValidPhone(raw: string): boolean {
    return isValidIndianPhone(raw);
}

export function normalisePhoneForMigration(raw: string): string | null {
    return normalisePhone(raw);
}

// ─── Date coercion ────────────────────────────────────────────────────────────
// Handles:
//   - Excel serial number (number or numeric string): days since 1899-12-30
//   - DD/MM/YYYY or DD-MM-YYYY strings
//   - YYYY-MM-DD ISO strings
//   - JS Date objects

const EXCEL_EPOCH = new Date(Date.UTC(1899, 11, 30)).getTime();
const MS_PER_DAY  = 86_400_000;

export function coerceDate(value: unknown): Date | null {
    if (value instanceof Date) return isNaN(value.getTime()) ? null : value;

    if (typeof value === 'number' || (typeof value === 'string' && /^\d+$/.test(value.trim()))) {
        const serial = Number(value);
        if (serial < 1 || serial > 200_000) return null;
        return new Date(EXCEL_EPOCH + serial * MS_PER_DAY);
    }

    if (typeof value === 'string') {
        const s = value.trim();

        // DD/MM/YYYY or DD-MM-YYYY
        const dmy = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
        if (dmy) {
            const d = new Date(Date.UTC(Number(dmy[3]), Number(dmy[2]) - 1, Number(dmy[1])));
            return isNaN(d.getTime()) ? null : d;
        }

        // YYYY-MM-DD
        const ymd = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
        if (ymd) {
            const d = new Date(Date.UTC(Number(ymd[1]), Number(ymd[2]) - 1, Number(ymd[3])));
            return isNaN(d.getTime()) ? null : d;
        }
    }

    return null;
}

// ─── Amount coercion ──────────────────────────────────────────────────────────
// Handles: 100000 | "100000" | "1,00,000" | "1,00,000.50" | "₹1,00,000"

export function coerceAmount(value: unknown): number | null {
    if (typeof value === 'number') return isFinite(value) && value >= 0 ? value : null;

    if (typeof value === 'string') {
        const cleaned = value
            .replace(/₹/g, '')
            .replace(/,/g, '')
            .trim();
        const n = parseFloat(cleaned);
        return isNaN(n) || n < 0 ? null : n;
    }

    return null;
}