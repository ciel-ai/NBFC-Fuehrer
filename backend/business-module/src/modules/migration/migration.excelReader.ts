import * as XLSX from 'xlsx';

export interface RawSheet {
    name: string;
    headers: string[];
    rows: Record<string, unknown>[];
}

export const LOAN_SHEET_REQUIRED_HEADERS = [
    'Loan Id',
    'Product',
    'loan_status',
    'Disburse Date',
    'Principle',
] as const;

export function readExcelFile(filePath: string): RawSheet[] {
    const workbook = XLSX.readFile(filePath, {
        cellDates: false, // keep dates as serials — coerceDate() handles them
        raw: true,
    });

    return workbook.SheetNames.map((name) => {
        const sheet = workbook.Sheets[name]!;
        const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
            defval: null,
            raw: true,
        });
        const headers = rows.length > 0 ? Object.keys(rows[0]!) : [];
        return { name, headers, rows };
    });
}

export function findSheetByHeaders(
    sheets: RawSheet[],
    requiredHeaders: readonly string[],
): RawSheet | undefined {
    return sheets.find((sheet) =>
        requiredHeaders.every((h) => sheet.headers.includes(h)),
    );
}