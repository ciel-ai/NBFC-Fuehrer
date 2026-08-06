// src/config.ts
//
// Runtime configuration flags (Task 2.2 — mock/real service swap).
//
// The live-data hooks (useLms, useDashboard, useStaffUsers,
// useApplications, …) are live-FIRST: they call the real API and fall back
// to the labelled sample store only when the API is unreachable.
//
// Setting VITE_USE_MOCK=true forces the sample-data path without touching
// the network — the demo/dev convention shared with the mobile app's
// EXPO_PUBLIC_USE_MOCK.

export const USE_MOCK: boolean =
  String(import.meta.env.VITE_USE_MOCK ?? '').toLowerCase() === 'true';

// Mirror of the mobile app's production guard (env.ts): a production bundle
// running in mock mode is a demo panel masquerading as the real back-office.
// Fail at startup, loudly, before anyone records a "decision" against sample data.
if (import.meta.env.PROD && USE_MOCK) {
  throw new Error(
    'FATAL: production build with VITE_USE_MOCK=true. Fix .env.production (VITE_USE_MOCK=false) and rebuild.',
  );
}

/**
 * Base URL of the staff API. Centralised here (single source of truth) so the
 * placeholder guard below always runs — the api/client.ts and staffAuth.api.ts
 * modules import this instead of reading the env var directly.
 */
export const API_URL: string =
  import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api/v1';

// A production bundle MUST point at a real API host. .env.production ships a
// placeholder (api.REPLACE_ME.in); if it is never replaced the deployed panel
// cannot reach any backend — a guaranteed day-one outage. Same policy as the
// mock guard above: fail loudly at startup rather than ship a dead console.
if (import.meta.env.PROD && (!import.meta.env.VITE_API_URL || API_URL.includes('REPLACE_ME'))) {
  throw new Error(
    'FATAL: production build with a missing or placeholder VITE_API_URL ' +
      `("${API_URL}"). Set the real API host in .env.production and rebuild.`,
  );
}

/** Sentry DSN — optional; monitoring is a silent no-op until set. */
export const SENTRY_DSN: string = String(import.meta.env.VITE_SENTRY_DSN ?? '');

// Crash reporting is a release requirement for a money-moving back-office. We do
// not hard-fail on a missing DSN (the app must still run without Sentry), but a
// production build with monitoring OFF is "flying blind" — surface it loudly.
if (import.meta.env.PROD && !SENTRY_DSN) {
  console.warn(
    'WARNING: production build with no VITE_SENTRY_DSN — crash reporting is OFF. ' +
      'Set the Sentry DSN in .env.production to enable monitoring.',
  );
}
