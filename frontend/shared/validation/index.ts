import { z } from 'zod';

export const phoneSchema = z
  .string()
  .min(10, { message: 'Phone number must be at least 10 digits' })
  .max(15, { message: 'Phone number is too long' })
  .regex(/^\+?[1-9]\d{1,14}$/, { message: 'Invalid phone number format' });

export const otpSchema = z
  .string()
  .length(6, { message: 'OTP must be exactly 6 characters' })
  .regex(/^\d+$/, { message: 'OTP must contain only digits' });

export const loginSchema = z.object({
  phone: phoneSchema,
});

export const verifyOtpSchema = z.object({
  phone: phoneSchema,
  otp: otpSchema,
});

export const profileUpdateSchema = z.object({
  name: z.string().min(2, { message: 'Name must be at least 2 characters' }).optional(),
  email: z.string().email({ message: 'Invalid email address' }).optional(),
});

export const loanApplicationSchema = z.object({
  productType: z.enum(['consumer_durable', 'affordable_housing', 'gold_loan']),
  amount: z.number().positive({ message: 'Amount must be greater than zero' }),
  tenure: z.number().int().positive({ message: 'Tenure must be a positive integer' }),
  merchantId: z.string().optional(),
});
