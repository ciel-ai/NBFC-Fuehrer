import { z } from 'zod';

const envSchema = z.object({
  EXPO_PUBLIC_API_URL: z.string().url(),
  EXPO_PUBLIC_USE_MOCK: z
    .string()
    .transform((val) => val === 'true'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
});

const parseEnv = () => {
  const nodeEnv = process.env.NODE_ENV ?? 'development';
  const parsed = envSchema.safeParse({
    EXPO_PUBLIC_API_URL: process.env.EXPO_PUBLIC_API_URL,
    EXPO_PUBLIC_USE_MOCK: process.env.EXPO_PUBLIC_USE_MOCK,
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
      NODE_ENV: 'development',
    };
  }

  if (parsed.data.NODE_ENV === 'production' && parsed.data.EXPO_PUBLIC_USE_MOCK) {
    throw new Error('Production builds cannot run with EXPO_PUBLIC_USE_MOCK=true');
  }

  return parsed.data;
};

export const Config = parseEnv();
