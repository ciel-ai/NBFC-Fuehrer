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

/** Positive currency amount, coerced from the text input. */
export const amountSchema = (min = 1, message = 'Enter a valid amount') =>
  z.coerce.number({ invalid_type_error: message }).min(min, message);

/** Generic positive integer (e.g. weight in grams, tenure). */
export const positiveNumberSchema = (message = 'Enter a valid number') =>
  z.coerce.number({ invalid_type_error: message }).positive(message);

export const consentSchema = z
  .literal(true, { errorMap: () => ({ message: 'Consent is required to proceed' }) });
