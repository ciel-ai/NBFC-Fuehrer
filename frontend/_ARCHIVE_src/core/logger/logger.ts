import { Config } from '../config/env';

export const logger = {
  debug: (...args: any[]) => {
    if (Config.NODE_ENV === 'development') {
      console.log('🐛 [DEBUG]', ...args);
    }
  },
  info: (...args: any[]) => {
    if (Config.NODE_ENV !== 'test') {
      console.log('ℹ️ [INFO]', ...args);
    }
  },
  warn: (...args: any[]) => {
    console.warn('⚠️ [WARN]', ...args);
  },
  error: (message: string, error?: unknown) => {
    console.error('🚨 [ERROR]', message, error);
    // In production, send to Sentry/Datadog
    if (Config.NODE_ENV === 'production') {
      // captureException(error);
    }
  },
};
