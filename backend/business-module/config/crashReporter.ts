// src/config/crashReporter.ts
//
// Crash-reporting / error-tracking wiring. The audit flagged that there was
// no APM/crash-reporting anywhere in the backend — an uncaught exception
// crashed the process silently with nothing captured beyond a stdout log
// line, and no alerting.
//
// Safe-by-default: if SENTRY_DSN isn't set (no live Sentry project yet),
// this no-ops entirely except for the existing structured logger — nothing
// about current behavior changes until a DSN is actually provisioned.
// The @sentry/node import is done lazily so a missing dependency (e.g. if
// `npm install` hasn't been re-run yet) never breaks server boot.

import { env } from '@/config/env';
import { createModuleLogger } from '@/config/logger';

const log = createModuleLogger('crashReporter');

let sentryClient: typeof import('@sentry/node') | null = null;
let initialized = false;

export function initCrashReporter(): void {
    if (initialized) return;
    initialized = true;

    if (!env.sentryDsn) {
        log.info('SENTRY_DSN not set — crash reporting disabled (logging only)');
        return;
    }

    try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports -- lazy load so a missing/not-yet-installed dependency never breaks boot
        sentryClient = require('@sentry/node');
        sentryClient!.init({
            dsn: env.sentryDsn,
            environment: env.nodeEnv,
            tracesSampleRate: env.isProd ? 0.1 : 0,
        });
        log.info('Crash reporting (Sentry) initialized', { environment: env.nodeEnv });
    } catch (err) {
        log.error('Failed to initialize Sentry — falling back to log-only error reporting', {
            error: err instanceof Error ? err.message : String(err),
        });
        sentryClient = null;
    }
}

export function reportError(err: unknown, context?: Record<string, unknown>): void {
    log.error('Reported error', {
        error: err instanceof Error ? err.message : String(err),
        stack: err instanceof Error ? err.stack : undefined,
        ...context,
    });

    if (sentryClient) {
        sentryClient.captureException(err, { extra: context });
    }
}