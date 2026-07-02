/** Download rows as a CSV file (Excel-friendly, UTF-8 BOM). */
export function exportCsv(
  filename: string,
  headers: string[],
  rows: (string | number | undefined | null)[][],
): void {
  const escape = (cell: string | number | undefined | null): string => {
    const s = cell === undefined || cell === null ? '' : String(cell);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const body = [headers, ...rows].map((r) => r.map(escape).join(',')).join('\r\n');
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
