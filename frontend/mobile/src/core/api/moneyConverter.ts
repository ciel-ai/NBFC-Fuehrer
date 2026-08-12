// src/core/api/moneyConverter.ts
//
// Counterpart to the backend's response-wide money converter
// (backend/business-module/src/middlewares/moneyConverter.middleware.ts),
// which converts every money-shaped field in a JSON response from rupees to
// paise before it goes on the wire — deliberately, to avoid floating-point
// ambiguity on money over HTTP (same rationale as emi.calculator.ts's "all
// monetary arithmetic uses integer paise internally... This is the same
// technique used by RBI-regulated payment systems").
//
// That conversion had no counterpart on this side: every real service (not
// just CDL's) read the raw response and displayed it directly, so every
// money field from the real API was 100x too large on screen. This runs
// once, globally, in api.ts's response interceptor — not a per-screen or
// per-endpoint fix — mirroring exactly what the backend does, in reverse.
//
// The word lists below MUST be kept in sync with the backend's own
// MONEY_WORDS / NON_MONEY_WORDS. This is the same manual-sync tradeoff the
// backend file itself documents ("adding a word here changes the wire
// format of every endpoint that returns it, so a new entry needs the same
// consumer audit a contract change gets") — the two codebases don't share
// a build, so there is no way to import one list into the other.

/** A key holds money when one of these appears in it as a whole word. */
const MONEY_WORDS = new Set([
  'amount', 'fee', 'emi', 'balance', 'income', 'interest', 'principal',
]);

/** Words that disqualify a key even when a money word sits next to it. */
const NON_MONEY_WORDS = new Set([
  'rate', 'rates', 'pct', 'percent', 'percentage', 'ratio',
  'count', 'counts', 'number', 'num', 'index',
  'date', 'dates', 'at', 'day', 'days',
  'id', 'ids', 'status', 'type', 'mode', 'flag',
  'rupees', 'paise',
]);

/** Splits camelCase and snake_case alike into lowercase words. */
function splitWords(key: string): string[] {
  return key
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1_$2')
    .toLowerCase()
    .split('_')
    .filter(Boolean);
}

function looksLikeMoneyKey(key: string): boolean {
  const words = splitWords(key);
  if (words.some((w) => NON_MONEY_WORDS.has(w))) return false;
  return words.some((w) => MONEY_WORDS.has(w));
}

// Only numeric values are money — a money *word* can appear in the key of a
// categorical string field, and parseFloat would turn those into NaN.
const NUMERIC_STRING = /^-?\d+(\.\d+)?$/;

function paiseToRupees(value: number): number {
  // Round to the nearest paisa first (defends against any upstream float
  // noise), then divide — matches the backend's own paisa-precision
  // convention rather than truncating.
  return Math.round(value) / 100;
}

/**
 * Recursively converts every money-shaped field in `obj` from paise
 * (integers, as the backend sends them) to rupees (for display). Mirrors
 * moneyConverter.middleware.ts's convertMoneyFields, inverted.
 */
export function convertMoneyFieldsFromPaise(obj: unknown): unknown {
  if (obj === null || obj === undefined) return obj;
  if (Array.isArray(obj)) return obj.map(convertMoneyFieldsFromPaise);
  if (obj instanceof Date) return obj;
  if (typeof obj !== 'object') return obj;

  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    const isPlainMoneyLike =
      (typeof value === 'number' ||
        (typeof value === 'string' && NUMERIC_STRING.test(value.trim()))) &&
      looksLikeMoneyKey(key);

    if (isPlainMoneyLike && value !== null && value !== undefined) {
      result[key] = paiseToRupees(typeof value === 'string' ? parseFloat(value) : value);
    } else if (typeof value === 'object' && value !== null) {
      result[key] = convertMoneyFieldsFromPaise(value);
    } else {
      result[key] = value;
    }
  }
  return result;
}
