import * as Sentry from '@sentry/react-native';
import { Config } from '@/src/core/config/env';

// ---------------------------------------------------------------------------
// Crash reporting. Init is a no-op until EXPO_PUBLIC_SENTRY_DSN is set in the
// build profile (eas.json / .env.*), so dev machines and CI need no account.
// Never capture PII: a lending app handles PAN/Aadhaar/bank data — scrub
// everything except what is needed to reproduce a crash.
// ---------------------------------------------------------------------------

export const MONITORING_ENABLED = Boolean(Config.EXPO_PUBLIC_SENTRY_DSN);

export function initMonitoring(): void {
  if (!MONITORING_ENABLED) return;
  Sentry.init({
    dsn: Config.EXPO_PUBLIC_SENTRY_DSN,
    environment: Config.EXPO_PUBLIC_USE_MOCK ? 'mock' : Config.NODE_ENV,
    sendDefaultPii: false,
    tracesSampleRate: 0.2,
    beforeSend(event) {
      // Belt-and-braces PII scrub: request bodies and user context never leave
      // the device. Breadcrumb messages keep navigation/console context only.
      if (event.request) delete event.request;
      if (event.user) event.user = { id: event.user.id };
      return event;
    },
  });
}

/**
 * Wraps the root component with Sentry's touch/navigation instrumentation.
 * Typed for the prop-less expo-router root; the cast bridges the two
 * @types/react copies in the monorepo (root React 18 vs mobile React 19).
 */
export function wrapRoot(root: () => React.JSX.Element): () => React.JSX.Element {
  if (!MONITORING_ENABLED) return root;
  return Sentry.wrap(root as never) as unknown as () => React.JSX.Element;
}

/** Manual capture for handled-but-noteworthy failures (offline queue, etc.). */
export function captureError(error: unknown, context?: Record<string, unknown>): void {
  if (!MONITORING_ENABLED) return;
  Sentry.captureException(error, context ? { extra: context } : undefined);
}
