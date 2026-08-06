import { z } from 'zod';

const envSchema = z.object({
  EXPO_PUBLIC_API_URL: z.string().url(),
  EXPO_PUBLIC_USE_MOCK: z
    .string()
    .transform((val) => val === 'true'),
  // Sentry DSN — optional. Monitoring is a silent no-op until it is set, so
  // local/dev builds work without a Sentry account.
  EXPO_PUBLIC_SENTRY_DSN: z.string().optional(),
  // Razorpay publishable key (rzp_live_… / rzp_test_…). Optional so mock/dev
  // builds run without it; required before real payments can be captured.
  EXPO_PUBLIC_RAZORPAY_KEY_ID: z.string().optional(),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
});

const parseEnv = () => {
  const nodeEnv = process.env.NODE_ENV ?? 'development';
  const parsed = envSchema.safeParse({
    EXPO_PUBLIC_API_URL: process.env.EXPO_PUBLIC_API_URL,
    EXPO_PUBLIC_USE_MOCK: process.env.EXPO_PUBLIC_USE_MOCK,
    EXPO_PUBLIC_SENTRY_DSN: process.env.EXPO_PUBLIC_SENTRY_DSN,
    EXPO_PUBLIC_RAZORPAY_KEY_ID: process.env.EXPO_PUBLIC_RAZORPAY_KEY_ID,
    NODE_ENV: nodeEnv,
  });

  if (!parsed.success) {
    console.error('❌ Invalid environment variables:', parsed.error.format());

    if (nodeEnv === 'production') {
      throw new Error('Invalid production environment variables');
    }

    return {
      EXPO_PUBLIC_API_URL: 'http://localhost:3000',
      EXPO_PUBLIC_USE_MOCK: true,
      EXPO_PUBLIC_SENTRY_DSN: undefined,
      EXPO_PUBLIC_RAZORPAY_KEY_ID: undefined,
      NODE_ENV: 'development',
    };
  }

  if (parsed.data.NODE_ENV === 'production' && parsed.data.EXPO_PUBLIC_USE_MOCK) {
    throw new Error('Production builds cannot run with EXPO_PUBLIC_USE_MOCK=true');
  }

  return parsed.data;
};

export const Config = parseEnv();
