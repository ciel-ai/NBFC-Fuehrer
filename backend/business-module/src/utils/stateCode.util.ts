// src/utils/stateCode.util.ts
//
// Maps the free-text Indian state name stored on customers.state (e.g.
// "Karnataka", "Tamil Nadu") to the 2-letter state code the eSign provider's
// applyEStamp() expects for stamp-duty calculation (see
// providers/esign/interface.ts ApplyEStampInput.stateCode, e.g. "MH" | "KA" |
// "TN"). Previously this was faked with customer.state.slice(0, 2) (or a flat
// 'KA' for housing loans), which is wrong for almost every state whose name
// doesn't start with its own code (e.g. "Tamil Nadu" → "Ta" instead of "TN",
// "Uttar Pradesh" → "Ut" instead of "UP") — the eStamp vendor uses this code
// to pick the correct state's duty rate, so a wrong code means the wrong duty
// is charged/recorded for the customer.

const STATE_NAME_TO_CODE: Record<string, string> = {
    'andhra pradesh': 'AP',
    'arunachal pradesh': 'AR',
    'assam': 'AS',
    'bihar': 'BR',
    'chhattisgarh': 'CG',
    'goa': 'GA',
    'gujarat': 'GJ',
    'haryana': 'HR',
    'himachal pradesh': 'HP',
    'jharkhand': 'JH',
    'karnataka': 'KA',
    'kerala': 'KL',
    'madhya pradesh': 'MP',
    'maharashtra': 'MH',
    'manipur': 'MN',
    'meghalaya': 'ML',
    'mizoram': 'MZ',
    'nagaland': 'NL',
    'odisha': 'OD',
    'orissa': 'OD',
    'punjab': 'PB',
    'rajasthan': 'RJ',
    'sikkim': 'SK',
    'tamil nadu': 'TN',
    'telangana': 'TS',
    'tripura': 'TR',
    'uttar pradesh': 'UP',
    'uttarakhand': 'UK',
    'west bengal': 'WB',
    // Union territories
    'andaman and nicobar islands': 'AN',
    'chandigarh': 'CH',
    'dadra and nagar haveli and daman and diu': 'DN',
    'delhi': 'DL',
    'nct of delhi': 'DL',
    'jammu and kashmir': 'JK',
    'ladakh': 'LA',
    'lakshadweep': 'LD',
    'puducherry': 'PY',
    'pondicherry': 'PY',
};

/** Safe default when the applicant's state is missing or unrecognised. */
export const DEFAULT_STATE_CODE = 'KA';

/**
 * Resolves a free-text Indian state name (as stored on customers.state) to
 * the 2-letter code the eSign provider expects for stamp-duty calculation.
 * Case-insensitive, tolerant of surrounding whitespace. Falls back to
 * DEFAULT_STATE_CODE when the state is missing or not recognised — same
 * fail-safe default the previous placeholder used, but now only exercised
 * for genuinely unknown input instead of on every single call.
 */
export function resolveStateCode(stateName: string | null | undefined): string {
    if (!stateName) return DEFAULT_STATE_CODE;
    const normalized = stateName.trim().toLowerCase();
    return STATE_NAME_TO_CODE[normalized] ?? DEFAULT_STATE_CODE;
}
