const mockSheetToJson = jest.fn();
const mockReadFile = jest.fn();

jest.mock('xlsx', () => ({
    readFile: (...args: unknown[]) => mockReadFile(...args),
    utils: {
        sheet_to_json: (...args: unknown[]) => mockSheetToJson(...args),
    },
}));

import {
    readExcelFile,
    findSheetByHeaders,
    LOAN_SHEET_REQUIRED_HEADERS,
} from '@/modules/migration/migration.excelReader';

const SHEET_NAME = 'Loans';
const SAMPLE_ROWS = [
    { 'Loan Id': 'L-001', 'Product': 'Gold Loan', 'loan_status': 'Active', 'Disburse Date': '2023-01-01', 'Principle': 50000 },
    { 'Loan Id': 'L-002', 'Product': 'Two Wheeler', 'loan_status': 'Closed', 'Disburse Date': '2022-06-15', 'Principle': 30000 },
];

beforeEach(() => {
    jest.clearAllMocks();
    mockReadFile.mockReturnValue({
        SheetNames: [SHEET_NAME],
        Sheets: { [SHEET_NAME]: {} },
    });
    mockSheetToJson.mockReturnValue(SAMPLE_ROWS);
});

describe('readExcelFile', () => {

    test('returns one RawSheet per sheet in the workbook', () => {
        const sheets = readExcelFile('/fake/path.xlsx');
        expect(sheets).toHaveLength(1);
        expect(sheets[0]!.name).toBe(SHEET_NAME);
    });

    test('extracts headers from the keys of the first row', () => {
        const [sheet] = readExcelFile('/fake/path.xlsx');
        expect(sheet!.headers).toEqual(Object.keys(SAMPLE_ROWS[0]!));
    });

    test('returns all rows', () => {
        const [sheet] = readExcelFile('/fake/path.xlsx');
        expect(sheet!.rows).toHaveLength(2);
    });

    test('returns empty headers and rows for an empty sheet', () => {
        mockSheetToJson.mockReturnValue([]);
        const [sheet] = readExcelFile('/fake/path.xlsx');
        expect(sheet!.headers).toEqual([]);
        expect(sheet!.rows).toHaveLength(0);
    });

    test('reads the file with cellDates:false to preserve date serials', () => {
        readExcelFile('/fake/path.xlsx');
        expect(mockReadFile).toHaveBeenCalledWith(
            '/fake/path.xlsx',
            expect.objectContaining({ cellDates: false }),
        );
    });

    test('handles workbooks with multiple sheets', () => {
        mockReadFile.mockReturnValue({
            SheetNames: ['Loans', 'Borrowers'],
            Sheets: { Loans: {}, Borrowers: {} },
        });
        mockSheetToJson
            .mockReturnValueOnce(SAMPLE_ROWS)
            .mockReturnValueOnce([{ 'Customer Id': 'C-001' }]);

        const sheets = readExcelFile('/fake/path.xlsx');
        expect(sheets).toHaveLength(2);
        expect(sheets[0]!.name).toBe('Loans');
        expect(sheets[1]!.name).toBe('Borrowers');
    });
});

describe('findSheetByHeaders', () => {

    test('returns the sheet that contains all required headers', () => {
        const sheets = readExcelFile('/fake/path.xlsx');
        const found = findSheetByHeaders(sheets, ['Loan Id', 'Product']);
        expect(found).toBeDefined();
        expect(found!.name).toBe(SHEET_NAME);
    });

    test('returns undefined when no sheet has all required headers', () => {
        const sheets = readExcelFile('/fake/path.xlsx');
        const found = findSheetByHeaders(sheets, ['Loan Id', 'Missing Column']);
        expect(found).toBeUndefined();
    });

    test('returns undefined for an empty sheets array', () => {
        const found = findSheetByHeaders([], ['Loan Id']);
        expect(found).toBeUndefined();
    });

    test('LOAN_SHEET_REQUIRED_HEADERS all exist in sample sheet', () => {
        const sheets = readExcelFile('/fake/path.xlsx');
        const found = findSheetByHeaders(sheets, LOAN_SHEET_REQUIRED_HEADERS);
        expect(found).toBeDefined();
    });
});