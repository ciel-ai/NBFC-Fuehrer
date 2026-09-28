// tests/unit/stateCode.util.test.ts
import { resolveStateCode, DEFAULT_STATE_CODE } from '@/utils/stateCode.util';

describe('resolveStateCode', () => {
    test('maps full state names to their correct 2-letter code', () => {
        expect(resolveStateCode('Karnataka')).toBe('KA');
        expect(resolveStateCode('Tamil Nadu')).toBe('TN');
        expect(resolveStateCode('Maharashtra')).toBe('MH');
        expect(resolveStateCode('Uttar Pradesh')).toBe('UP');
        expect(resolveStateCode('West Bengal')).toBe('WB');
    });

    test('is case-insensitive and tolerant of surrounding whitespace', () => {
        expect(resolveStateCode('tamil nadu')).toBe('TN');
        expect(resolveStateCode('  Maharashtra  ')).toBe('MH');
        expect(resolveStateCode('KARNATAKA')).toBe('KA');
    });

    test('falls back to the default code for missing or unrecognised input', () => {
        expect(resolveStateCode(null)).toBe(DEFAULT_STATE_CODE);
        expect(resolveStateCode(undefined)).toBe(DEFAULT_STATE_CODE);
        expect(resolveStateCode('')).toBe(DEFAULT_STATE_CODE);
        expect(resolveStateCode('Not A Real State')).toBe(DEFAULT_STATE_CODE);
    });

    test('does not just take the first two letters of the name (regression: the old slice(0,2) bug)', () => {
        // "Tamil Nadu".slice(0, 2) === "Ta" — wrong. Real code is "TN".
        expect(resolveStateCode('Tamil Nadu')).not.toBe('Ta'.toUpperCase());
        expect(resolveStateCode('Tamil Nadu')).toBe('TN');
        // "Uttar Pradesh".slice(0, 2) === "Ut" — wrong. Real code is "UP".
        expect(resolveStateCode('Uttar Pradesh')).not.toBe('UT');
        expect(resolveStateCode('Uttar Pradesh')).toBe('UP');
    });
});
