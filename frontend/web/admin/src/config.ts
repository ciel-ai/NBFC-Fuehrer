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
