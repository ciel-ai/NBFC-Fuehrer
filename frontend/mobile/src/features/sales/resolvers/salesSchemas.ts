import { z } from 'zod';

// ---------------------------------------------------------------------------
// Reusable zod field schemas for the sales wizard. Step schemas in the product
// configs compose these. All use mode: 'onChange' at the form level, so the
// messages here surface inline beneath each field exactly like login.tsx.
// ---------------------------------------------------------------------------

export const nameSchema = z
  .string()
  .trim()
  .min(2, 'Enter a valid name')
  .max(60, 'Name is too long');

export const panSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z]{5}[0-9]{4}[A-Z]$/, 'Invalid PAN (e.g. ABCDE1234F)');

export const aadhaarSchema = z
  .string()
  .trim()
  .regex(/^\d{12}$/, 'Aadhaar must be 12 digits');

export const phoneSchema = z
  .string()
  .trim()
  .regex(/^[6-9]\d{9}$/, 'Enter a valid 10-digit mobile number');

export const emailSchema = z.string().trim().email('Enter a valid email address');

export const pincodeSchema = z
  .string()
  .trim()
  .regex(/^\d{6}$/, 'PIN code must be 6 digits');

export const ifscSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z]{4}0[A-Z0-9]{6}$/, 'Invalid IFSC (e.g. HDFC0001234)');

export const accountNumberSchema = z
  .string()
  .trim()
  .regex(/^\d{9,18}$/, 'Account number must be 9–18 digits');

export const requiredText = (label = 'This field') =>
  z.string().trim().min(1, `${label} is required`);

export const requiredSelect = (label = 'an option') =>
  z.string().min(1, `Please select ${label}`);

/** A captured photo / uploaded document — stored as a URI string. */
export const requiredAsset = (label = 'a file') =>
  z.string().min(1, `Please add ${label}`);

export const requiredDate = (label = 'a date') =>
  z.string().min(1, `Please pick ${label}`);

function ageFromIso(iso: string): number | null {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - d.getFullYear();
  const monthDiff = today.getMonth() - d.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < d.getDate())) age -= 1;
  return age;
}

/** Date of birth (ISO string from the date field) — applicant must be an adult. */
export const dobAdultSchema = z
  .string()
  .min(1, 'Please pick a date of birth')
  .refine((v) => {
    const age = ageFromIso(v);
    return age !== null && age >= 18;
  }, 'Applicant must be at least 18 years old')
  .refine((v) => {
    const age = ageFromIso(v);
    return age === null || age <= 100;
  }, 'Date of birth seems incorrect — please check');

/**
 * Format rules per KYC ID type — for steps where one ID-number field serves a
 * type selector. Returns an error message, or null when the number is valid.
 */
const ID_NUMBER_RULES: Record<string, { pattern: RegExp; message: string }> = {
  pan: { pattern: /^[A-Z]{5}[0-9]{4}[A-Z]$/, message: 'Invalid PAN (e.g. ABCDE1234F)' },
  aadhaar: { pattern: /^\d{12}$/, message: 'Aadhaar must be 12 digits' },
  passport: { pattern: /^[A-Z][0-9]{7}$/, message: 'Invalid passport number (e.g. A1234567)' },
  voter: { pattern: /^[A-Z]{3}[0-9]{7}$/, message: 'Invalid Voter ID (e.g. ABC1234567)' },
};

export const validateIdNumber = (idType: string, idNumber: string): string | null => {
  const rule = ID_NUMBER_RULES[idType];
  if (!rule) return null;
  return rule.pattern.test(idNumber.trim().toUpperCase()) ? null : rule.message;
};

/** Positive currency amount, coerced from the text input. */
export const amountSchema = (min = 1, message = 'Enter a valid amount') =>
  z.coerce.number({ invalid_type_error: message }).min(min, message);

/** Generic positive integer (e.g. weight in grams, tenure). */
export const positiveNumberSchema = (message = 'Enter a valid number') =>
  z.coerce.number({ invalid_type_error: message }).positive(message);

export const consentSchema = z
  .literal(true, { errorMap: () => ({ message: 'Consent is required to proceed' }) });
