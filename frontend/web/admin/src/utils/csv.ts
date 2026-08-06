/**
 * Characters that make Excel / Google Sheets treat a cell as a formula rather
 * than text. A row of operator-entered free text (an audit remark, a customer
 * name) that starts with one of these becomes executable on open — the classic
 * CSV-injection path to `=cmd|'/c calc'!A0` or a silent `=IMPORTXML(...)`
 * exfiltration of the rest of the sheet.
 *
 * Tab and CR are included because both spreadsheets strip leading whitespace
 * before deciding, so "\t=1+1" is still parsed as a formula.
 */
const FORMULA_LEAD = /^[=+\-@\t\r]/;

/**
 * Neutralise a cell that a spreadsheet would otherwise evaluate.
 *
 * Prefixing a single quote is the standard mitigation (OWASP): Excel and Sheets
 * both read a leading `'` as "the rest of this cell is literal text" and do not
 * render the quote itself. Exported here for the unit tests.
 */
export function neutralizeFormula(s: string): string {
  return FORMULA_LEAD.test(s) ? `'${s}` : s;
}

export type CsvCell = string | number | undefined | null;

/**
 * Serialise one cell: neutralise formulas first, then apply RFC-4180 quoting.
 *
 * Order matters — the injected `'` has to end up *inside* the quotes, and a
 * single cell can need both treatments (e.g. `=A1,"x"`). Exported for tests.
 */
export function escapeCell(cell: CsvCell): string {
  const raw = cell === undefined || cell === null ? '' : String(cell);
  const s = neutralizeFormula(raw);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** The full CSV text (no BOM). Pure — exported so it can be tested headlessly. */
export function buildCsvBody(headers: string[], rows: CsvCell[][]): string {
  return [headers, ...rows].map((r) => r.map(escapeCell).join(',')).join('\r\n');
}

/** Download rows as a CSV file (Excel-friendly, UTF-8 BOM). */
export function exportCsv(filename: string, headers: string[], rows: CsvCell[][]): void {
  const body = buildCsvBody(headers, rows);
  const blob = new Blob(['﻿' + body], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.csv') ? filename : `${filename}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
