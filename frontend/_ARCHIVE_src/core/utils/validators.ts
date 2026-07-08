import { z } from 'zod';

// PAN validation regex: 5 letters + 4 digits + 1 letter
export const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;

// Indian mobile number: starts with 6-9, followed by 9 digits
export const PHONE_REGEX = /^[6-9]\d{9}$/;

// GST number regex

// Zod schemas
export const phoneSchema = z.object({
  phone: z
    .string()
    .min(1, 'Mobile number is required')
    .regex(PHONE_REGEX, 'Enter a valid 10-digit mobile number'),
});

export const otpSchema = z.object({
  otp: z
    .string()
    .min(6, 'Enter all 6 digits')
    .max(6, 'OTP must be 6 digits')
    .regex(/^\d{6}$/, 'OTP must contain only digits'),
});

export const panSchema = z.object({
  pan: z
    .string()
    .min(1, 'PAN number is required')
    .regex(PAN_REGEX, 'Enter a valid PAN number (e.g. ABCDE1234F)'),
});

export const loanApplicationSchema = z.object({
  amount: z
    .number()
    .min(10000, 'Minimum loan amount is ₹10,000')
    .max(5000000, 'Maximum loan amount is ₹50 Lakhs'),
  tenure: z.number().min(3).max(60),
  purpose: z.string().min(1, 'Purpose is required'),
});

export type PhoneFormData = z.infer<typeof phoneSchema>;
export type OTPFormData = z.infer<typeof otpSchema>;
export type PANFormData = z.infer<typeof panSchema>;
export type LoanApplicationFormData = z.infer<typeof loanApplicationSchema>;

/**
 * Validate PAN format (without Zod)
 */
export function isValidPAN(pan: string): boolean {
  return PAN_REGEX.test(pan.toUpperCase());
}

/**
 * Validate Indian phone number (without Zod)
 */
export function isValidPhone(phone: string): boolean {
  return PHONE_REGEX.test(phone);
}

// Letters and spaces only, minimum 3 characters after trim
export const NAME_REGEX = /^[a-zA-Z\s]+$/;

export const validateName = (name: string): boolean => {
  const trimmed = name.trim();
  return NAME_REGEX.test(trimmed) && trimmed.length > 2;
};
