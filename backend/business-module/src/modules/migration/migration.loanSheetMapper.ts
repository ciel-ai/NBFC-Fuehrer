import { z } from 'zod';
import { LoanRowSchema } from './migration.schema';
import { coerceDate, coerceAmount } from './migration.validator';
import {
    readExcelFile,
    findSheetByHeaders,
    LOAN_SHEET_REQUIRED_HEADERS,
} from './migration.excelReader';
import type { RawSheet } from './migration.excelReader';


// ─── Sheet-level schema ───────────────────────────────────────────────────────
// borrowerLegacyId and monthlyEmi are optional at the sheet-parsing layer.
// borrowerLegacyId: PENDING — populate from borrower sheet when available.
// monthlyEmi: EMI [table] column format is unconfirmed — made optional.

const LoanSheetRowSchema = LoanRowSchema.partial({
    borrowerLegacyId: true,
    monthlyEmi: true,
});

export type LoanSheetRow = z.infer<typeof LoanSheetRowSchema>;

// ─── Status mapping ───────────────────────────────────────────────────────────
// Add entries here when new values are discovered in the client file.

const STATUS_MAP: Record<string, string> = {
    'active':      'ACTIVE',
    'closed':      'CLOSED',
    'npa':         'NPA',
    'written off': 'WRITTEN_OFF',
    'write off':   'WRITTEN_OFF',
    'written-off': 'WRITTEN_OFF',
};

// ─── Product mapping ──────────────────────────────────────────────────────────
// Add entries here when new values are discovered in the client file.

const PRODUCT_MAP: Record<string, string> = {
    'consumer durable':  'CONSUMER_DURABLE',
    'two wheeler':       'TWO_WHEELER',
    '2 wheeler':         'TWO_WHEELER',
    'education device':  'EDUCATION_DEVICE',
    'gold loan':         'GOLD_LOAN',
    'housing loan':      'HOUSING_LOAN',
    'home loan':         'HOUSING_LOAN',
};

function normaliseStatus(raw: unknown): unknown {
    if (typeof raw !== 'string') return raw;
    return STATUS_MAP[raw.toLowerCase().trim()] ?? raw;
}

function normaliseProduct(raw: unknown): unknown {
    if (typeof raw !== 'string') return raw;
    return PRODUCT_MAP[raw.toLowerCase().trim()] ?? raw;
}

// ─── Column → field mapping ───────────────────────────────────────────────────

function mapRawRow(row: Record<string, unknown>): Record<string, unknown> {
    return {
        legacyId:           row['Loan Id'],
        accountNumber:      row['External Loan Id'],
        productType:        normaliseProduct(row['Product']),
        interestRate:       row['Interest Rate'],
        disbursedAt:        coerceDate(row['Disburse Date']),
        status:             normaliseStatus(row['loan_status']),
        tenureMonths:       row['Tenure'],
        principalAmount:    coerceAmount(row['Principle']),
        outstandingBalance: coerceAmount(row['Principle outstanding']),
        monthlyEmi:         coerceAmount(row['EMI [table]']) ?? undefined,
        // borrowerLegacyId: PENDING — no source column in this sheet
        // razorpayMandateId: not present in this sheet (optional field)
    };
}

// ─── Result types ─────────────────────────────────────────────────────────────

export interface LoanMappingSuccess {
    rowIndex: number;
    legacyId: string;
    data: LoanSheetRow;
    errors: [];
}

export interface LoanMappingFailure {
    rowIndex: number;
    legacyId: string | null;
    data: null;
    errors: string[];
}

export type LoanMappingResult = LoanMappingSuccess | LoanMappingFailure;

// ─── Main mapper ──────────────────────────────────────────────────────────────

export function mapLoanSheet(sheet: RawSheet): LoanMappingResult[] {
    return sheet.rows
        .filter((row) => row['Loan Id'] != null)
        .map((row, idx) => {
            const rowIndex = idx + 2;
            const legacyId = typeof row['Loan Id'] === 'string'
                ? row['Loan Id']
                : String(row['Loan Id'] ?? '');

            const mapped = mapRawRow(row);
            const result = LoanSheetRowSchema.safeParse(mapped);

            if (result.success) {
                return { rowIndex, legacyId, data: result.data, errors: [] };
            }

            const errors = result.error.errors.map(
                (e) => `${e.path.join('.') || 'row'}: ${e.message}`,
            );
            return { rowIndex, legacyId: legacyId || null, data: null, errors };
        });
}                                                    // ← mapLoanSheet closes HERE

// ─── Duplicate Loan Id detection ──────────────────────────────────────────────

export interface DuplicateLoanId {
    legacyId: string;
    rowIndices: number[];
}

export function detectDuplicateLoanIds(sheet: RawSheet): DuplicateLoanId[] {
    const seen = new Map<string, number[]>();

    sheet.rows.forEach((row, idx) => {
        const id = row['Loan Id'];
        if (id == null) return;
        const key = String(id);
        const indices = seen.get(key) ?? [];
        indices.push(idx + 2);
        seen.set(key, indices);
    });

    return Array.from(seen.entries())
        .filter(([, indices]) => indices.length > 1)
        .map(([legacyId, rowIndices]) => ({ legacyId, rowIndices }));
}

// ─── Orchestrator ─────────────────────────────────────────────────────────────

export interface ParseLoanExcelResult {
    sheet: RawSheet;
    duplicates: DuplicateLoanId[];
    results: LoanMappingResult[];
}

export function parseLoanExcel(filePath: string): ParseLoanExcelResult {
    const sheets = readExcelFile(filePath);
    const sheet = findSheetByHeaders(sheets, LOAN_SHEET_REQUIRED_HEADERS);

    if (!sheet) {
        const found = sheets.map((s) => `"${s.name}"`).join(', ') || 'none';
        throw new Error(
            `Loan sheet not found in workbook. ` +
            `Required headers: ${LOAN_SHEET_REQUIRED_HEADERS.join(', ')}. ` +
            `Sheets found: ${found}.`,
        );
    }

    const duplicates = detectDuplicateLoanIds(sheet);
    const results    = mapLoanSheet(sheet);

    return { sheet, duplicates, results };
}