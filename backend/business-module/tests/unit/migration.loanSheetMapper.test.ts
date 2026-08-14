// tests/unit/migration.loanSheetMapper.test.ts

const mockReadExcelFile = jest.fn();
const mockFindSheetByHeaders = jest.fn();

jest.mock('@/modules/migration/migration.excelReader', () => ({
    readExcelFile:            (...args: unknown[]) => mockReadExcelFile(...args),
    findSheetByHeaders:       (...args: unknown[]) => mockFindSheetByHeaders(...args),
    LOAN_SHEET_REQUIRED_HEADERS: ['Loan Id', 'Product', 'loan_status', 'Disburse Date', 'Principle'],
}));

import {
    mapLoanSheet,
    detectDuplicateLoanIds,
    parseLoanExcel,
} from '@/modules/migration/migration.loanSheetMapper';
import type { RawSheet } from '@/modules/migration/migration.excelReader';

const VALID_ROW: Record<string, unknown> = {
    'Loan Id':               'LOAN-001',
    'External Loan Id':      'ACC123456',
    'Product':               'Gold Loan',
    'Interest Rate':         13.5,
    'Disburse Date':         '2023-06-01',
    'loan_status':           'Active',
    'Tenure':                24,
    'Principle':             50000,
    'Principle outstanding': 45000,
    'EMI [table]':           2366,
};

function makeSheet(rows: Record<string, unknown>[]): RawSheet {
    return { name: 'Sheet1', headers: Object.keys(VALID_ROW), rows };
}

// ─── mapLoanSheet ─────────────────────────────────────────────────────────────

describe('mapLoanSheet', () => {

    test('maps a valid row successfully', () => {
        const [result] = mapLoanSheet(makeSheet([VALID_ROW]));
        expect(result!.errors).toHaveLength(0);
        expect(result!.data).not.toBeNull();
        expect(result!.legacyId).toBe('LOAN-001');
    });

    test('normalises loan_status case-insensitively', () => {
        for (const v of ['Active', 'active', 'ACTIVE']) {
            const [result] = mapLoanSheet(makeSheet([{ ...VALID_ROW, 'loan_status': v }]));
            expect(result!.errors).toHaveLength(0);
            expect(result!.data?.status).toBe('ACTIVE');
        }
    });

    test('normalises written off status', () => {
        for (const v of ['Written Off', 'write off', 'written-off']) {
            const [result] = mapLoanSheet(makeSheet([{ ...VALID_ROW, 'loan_status': v }]));
            expect(result!.errors).toHaveLength(0);
            expect(result!.data?.status).toBe('WRITTEN_OFF');
        }
    });

    test('normalises product name case-insensitively', () => {
        const [result] = mapLoanSheet(makeSheet([{ ...VALID_ROW, 'Product': 'gold loan' }]));
        expect(result!.errors).toHaveLength(0);
        expect(result!.data?.productType).toBe('GOLD_LOAN');
    });

    test('maps all supported product types', () => {
        const cases: [string, string][] = [
            ['Consumer Durable', 'CONSUMER_DURABLE'],
            ['Two Wheeler',      'TWO_WHEELER'],
            ['2 Wheeler',        'TWO_WHEELER'],
            ['Education Device', 'EDUCATION_DEVICE'],
            ['Housing Loan',     'HOUSING_LOAN'],
            ['Home Loan',        'HOUSING_LOAN'],
        ];
        for (const [input, expected] of cases) {
            const [result] = mapLoanSheet(makeSheet([{ ...VALID_ROW, 'Product': input }]));
            expect(result!.data?.productType).toBe(expected);
        }
    });

    test('captures error for unknown loan_status — does not throw', () => {
        const [result] = mapLoanSheet(makeSheet([{ ...VALID_ROW, 'loan_status': 'Restructured' }]));
        expect(result!.data).toBeNull();
        expect(result!.errors.length).toBeGreaterThan(0);
    });

    test('captures error for unknown product type — does not throw', () => {
        const [result] = mapLoanSheet(makeSheet([{ ...VALID_ROW, 'Product': 'Personal Loan' }]));
        expect(result!.data).toBeNull();
        expect(result!.errors.length).toBeGreaterThan(0);
    });

    test('coerces disbursedAt from Excel serial number', () => {
        const [result] = mapLoanSheet(makeSheet([{ ...VALID_ROW, 'Disburse Date': 45078 }]));
        expect(result!.errors).toHaveLength(0);
        expect(result!.data?.disbursedAt).toBeInstanceOf(Date);
    });

    test('coerces principalAmount from comma-formatted string', () => {
        const [result] = mapLoanSheet(makeSheet([{ ...VALID_ROW, 'Principle': '50,000' }]));
        expect(result!.errors).toHaveLength(0);
        expect(result!.data?.principalAmount).toBe(50000);
    });

    test('borrowerLegacyId is absent and does not cause failure', () => {
        const [result] = mapLoanSheet(makeSheet([VALID_ROW]));
        expect(result!.errors).toHaveLength(0);
        expect(result!.data?.borrowerLegacyId).toBeUndefined();
    });

    test('monthlyEmi is absent when EMI [table] is null', () => {
        const [result] = mapLoanSheet(makeSheet([{ ...VALID_ROW, 'EMI [table]': null }]));
        expect(result!.errors).toHaveLength(0);
        expect(result!.data?.monthlyEmi).toBeUndefined();
    });

    test('skips rows where Loan Id is null', () => {
        const results = mapLoanSheet(makeSheet([
            { ...VALID_ROW, 'Loan Id': null },
            VALID_ROW,
        ]));
        expect(results).toHaveLength(1);
        expect(results[0]!.legacyId).toBe('LOAN-001');
    });

    test('rowIndex starts at 2 (accounts for header row)', () => {
        const [result] = mapLoanSheet(makeSheet([VALID_ROW]));
        expect(result!.rowIndex).toBe(2);
    });

    test('captures error for missing required field', () => {
        const { 'Principle': _, ...withoutPrinciple } = VALID_ROW;
        const [result] = mapLoanSheet(makeSheet([withoutPrinciple]));
        expect(result!.data).toBeNull();
        expect(result!.errors.some(e => e.includes('principalAmount'))).toBe(true);
    });

    test('processes multiple rows independently', () => {
        const results = mapLoanSheet(makeSheet([
            VALID_ROW,
            { ...VALID_ROW, 'Loan Id': 'LOAN-002', 'loan_status': 'BadValue' },
            { ...VALID_ROW, 'Loan Id': 'LOAN-003' },
        ]));
        expect(results).toHaveLength(3);
        expect(results[0]!.errors).toHaveLength(0);
        expect(results[1]!.data).toBeNull();
        expect(results[2]!.errors).toHaveLength(0);
    });
});

// ─── detectDuplicateLoanIds ───────────────────────────────────────────────────

describe('detectDuplicateLoanIds', () => {

    test('returns empty array when all Loan Ids are unique', () => {
        const sheet = makeSheet([
            { ...VALID_ROW, 'Loan Id': 'L-001' },
            { ...VALID_ROW, 'Loan Id': 'L-002' },
        ]);
        expect(detectDuplicateLoanIds(sheet)).toHaveLength(0);
    });

    test('detects a single duplicate', () => {
        const sheet = makeSheet([
            { ...VALID_ROW, 'Loan Id': 'L-001' },
            { ...VALID_ROW, 'Loan Id': 'L-001' },
            { ...VALID_ROW, 'Loan Id': 'L-002' },
        ]);
        const dupes = detectDuplicateLoanIds(sheet);
        expect(dupes).toHaveLength(1);
        expect(dupes[0]!.legacyId).toBe('L-001');
        expect(dupes[0]!.rowIndices).toEqual([2, 3]);
    });

    test('reports correct row indices for duplicates', () => {
        const sheet = makeSheet([
            { ...VALID_ROW, 'Loan Id': 'L-001' },
            { ...VALID_ROW, 'Loan Id': 'L-002' },
            { ...VALID_ROW, 'Loan Id': 'L-001' },
        ]);
        const dupes = detectDuplicateLoanIds(sheet);
        expect(dupes[0]!.rowIndices).toEqual([2, 4]);
    });

    test('detects multiple independent duplicates', () => {
        const sheet = makeSheet([
            { ...VALID_ROW, 'Loan Id': 'L-001' },
            { ...VALID_ROW, 'Loan Id': 'L-002' },
            { ...VALID_ROW, 'Loan Id': 'L-001' },
            { ...VALID_ROW, 'Loan Id': 'L-002' },
        ]);
        expect(detectDuplicateLoanIds(sheet)).toHaveLength(2);
    });

    test('ignores rows where Loan Id is null', () => {
        const sheet = makeSheet([
            { ...VALID_ROW, 'Loan Id': null },
            { ...VALID_ROW, 'Loan Id': null },
        ]);
        expect(detectDuplicateLoanIds(sheet)).toHaveLength(0);
    });

    test('returns empty array for empty sheet', () => {
        expect(detectDuplicateLoanIds(makeSheet([]))).toHaveLength(0);
    });
});

// ─── parseLoanExcel ───────────────────────────────────────────────────────────

describe('parseLoanExcel', () => {

    const STUB_SHEET: RawSheet = {
        name: 'Sheet1',
        headers: Object.keys(VALID_ROW),
        rows: [VALID_ROW],
    };

    beforeEach(() => {
        jest.clearAllMocks();
        mockReadExcelFile.mockReturnValue([STUB_SHEET]);
        mockFindSheetByHeaders.mockReturnValue(STUB_SHEET);
    });

    test('returns sheet, results, and duplicates on success', () => {
        const out = parseLoanExcel('/fake/loans.xlsx');
        expect(out.sheet).toBeDefined();
        expect(out.results).toHaveLength(1);
        expect(out.duplicates).toHaveLength(0);
    });

    test('throws a descriptive error when loan sheet is not found', () => {
        mockFindSheetByHeaders.mockReturnValue(undefined);
        expect(() => parseLoanExcel('/fake/loans.xlsx')).toThrow(
            'Loan sheet not found in workbook',
        );
    });

    test('reports duplicates when the same Loan Id appears twice', () => {
        const sheetWithDupe: RawSheet = {
            ...STUB_SHEET,
            rows: [VALID_ROW, { ...VALID_ROW }],
        };
        mockFindSheetByHeaders.mockReturnValue(sheetWithDupe);
        const out = parseLoanExcel('/fake/loans.xlsx');
        expect(out.duplicates).toHaveLength(1);
        expect(out.duplicates[0]!.legacyId).toBe('LOAN-001');
    });
});