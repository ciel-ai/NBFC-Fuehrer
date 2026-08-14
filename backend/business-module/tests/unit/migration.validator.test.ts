// tests/unit/migration.validator.test.ts
import {
    isValidPan,
    normalisePan,
    isValidAadhaar,
    normaliseAadhaar,
    isValidPhone,
    normalisePhoneForMigration,
    coerceDate,
    coerceAmount,
} from '@/modules/migration/migration.validator';

describe('isValidPan', () => {
    it('accepts valid individual PAN', () => {
        expect(isValidPan('ABCPE1234F')).toBe(true);
    });
    it('rejects lowercase', () => {
        expect(isValidPan('abcpe1234f')).toBe(false);
    });
    it('rejects wrong length', () => {
        expect(isValidPan('ABCPE123')).toBe(false);
    });
    it('rejects invalid entity char (digit in 4th position)', () => {
        expect(isValidPan('ABC1E1234F')).toBe(false);
    });
});

describe('normalisePan', () => {
    it('uppercases and strips spaces', () => {
        expect(normalisePan('  abcpe 1234f  ')).toBe('ABCPE1234F');
    });
});

describe('isValidAadhaar', () => {
    it('rejects non-12-digit input', () => {
        expect(isValidAadhaar('12345')).toBe(false);
    });
    it('rejects Aadhaar starting with 0', () => {
        expect(isValidAadhaar('012345678901')).toBe(false);
    });
    it('rejects Aadhaar starting with 1', () => {
        expect(isValidAadhaar('112345678901')).toBe(false);
    });
    it('rejects non-numeric input', () => {
        expect(isValidAadhaar('abcd12345678')).toBe(false);
    });
    it('rejects a known-bad 12-digit number', () => {
        expect(isValidAadhaar('234123456789')).toBe(false);
    });
});

describe('normaliseAadhaar', () => {
    it('strips spaces', () => {
        expect(normaliseAadhaar('2345 6789 0123')).toBe('234567890123');
    });
});

describe('isValidPhone', () => {
    it('accepts 10-digit mobile starting with 9', () => {
        expect(isValidPhone('9876543210')).toBe(true);
    });
    it('accepts +91 prefixed number', () => {
        expect(isValidPhone('+919876543210')).toBe(true);
    });
    it('rejects number starting with 5', () => {
        expect(isValidPhone('5876543210')).toBe(false);
    });
    it('rejects landline-length number', () => {
        expect(isValidPhone('044123456')).toBe(false);
    });
});

describe('coerceDate', () => {
    it('handles Excel serial number', () => {
        const d = coerceDate(44927);
        expect(d).toBeInstanceOf(Date);
        expect(d!.getUTCFullYear()).toBe(2023);
    });
    it('handles DD/MM/YYYY string', () => {
        const d = coerceDate('01/06/2022');
        expect(d).toBeInstanceOf(Date);
        expect(d!.getUTCMonth()).toBe(5); // June = 5
    });
    it('handles YYYY-MM-DD string', () => {
        const d = coerceDate('2022-06-01');
        expect(d).toBeInstanceOf(Date);
        expect(d!.getUTCDate()).toBe(1);
    });
    it('handles DD-MM-YYYY string', () => {
        const d = coerceDate('01-06-2022');
        expect(d).toBeInstanceOf(Date);
        expect(d!.getUTCMonth()).toBe(5);
    });
    it('returns null for garbage input', () => {
        expect(coerceDate('not-a-date')).toBeNull();
    });
    it('passes through a valid Date object', () => {
        const input = new Date('2022-01-01');
        expect(coerceDate(input)).toBe(input);
    });
});

describe('coerceAmount', () => {
    it('handles plain number', () => {
        expect(coerceAmount(100000)).toBe(100000);
    });
    it('handles Indian comma-formatted string', () => {
        expect(coerceAmount('1,00,000')).toBe(100000);
    });
    it('handles rupee symbol + commas', () => {
        expect(coerceAmount('₹1,00,000.50')).toBeCloseTo(100000.5);
    });
    it('handles numeric string', () => {
        expect(coerceAmount('50000')).toBe(50000);
    });
    it('returns null for negative', () => {
        expect(coerceAmount(-100)).toBeNull();
    });
    it('returns null for garbage', () => {
        expect(coerceAmount('abc')).toBeNull();
    });
});