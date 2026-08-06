import { defineConfig } from 'vitest/config';

// Unit tests for pure utils (money formatting, mappers) — node env, no DOM.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/__tests__/**/*.test.ts'],

    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],

      /* Scoped deliberately.
       *
       * The god screens (pages/reports/Reports.tsx 1,217 lines,
       * pages/applications/tabs.tsx 1,157, …) cannot be covered at all until the
       * component-test stack lands (jsdom + Testing Library — gate G4). Measuring
       * them today would produce a number nobody can move, and a floor set low
       * enough to pass with them included would be meaningless.
       *
       * So the floor is scoped to the two directories holding the logic that
       * decides money and permissions — utils/ and store/ — which are plain
       * modules, testable right now. Listing them explicitly (rather than letting
       * v8 report only what the tests happened to import) is the point: store/ is
       * currently 0% and MUST show up as 0%, otherwise the number flatters us.
       *
       * Widen `include` as G4 lands. */
      include: ['src/utils/**/*.ts', 'src/store/**/*.ts'],
      exclude: ['src/**/__tests__/**'],

      /* An initial floor, not a target — set to ratchet upward as payment
       * allocation and the four-eyes gate get their tests (gate G2).
       *
       * The floor is glob-scoped to utils/ rather than applied globally, and
       * that is deliberate. store/ stays in `include` above so appStore.ts keeps
       * showing up as 0% — the gap should be visible in every CI run — but it is
       * not fenced yet, because the G2 plan is to *extract* the money logic out
       * of the 622-line store (as finance.ts already did) rather than test it in
       * place. Fencing it today would only fail the build on work nobody has
       * started.
       *
       * Measured 2026-08-03 with the full suite (74 tests):
       *   utils/          76.24% lines, 80.82% functions  ← what the floor fences
       *   utils/ + store/ 35.84% lines, 30.89% functions  ← the honest whole
       * So 30/30 passes with real headroom on utils/. The headroom is the point:
       * the floor exists to catch a regression, not to certify the codebase.
       * Raise it (60/70 is within reach) once deviations.ts and format.ts are
       * finished off, and extend it to store/ as G2 lands. */
      thresholds: {
        'src/utils/**/*.ts': {
          lines: 30,
          functions: 30,
        },
      },
    },
  },
});
