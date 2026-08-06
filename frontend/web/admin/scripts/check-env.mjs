#!/usr/bin/env node
//
// check-env.mjs — the build-time half of the src/config.ts guards.
//
// src/config.ts throws on a bad production config, but those are *runtime*
// throws: they fire when a browser evaluates the bundle, not when `vite build`
// runs. That means CI can go green on a bundle that white-screens on first load.
// This script closes that gap by evaluating the same conditions ahead of time.
//
// Deliberately NOT wired into `npm run build` or the everyday push/PR CI job:
// the production API URL does not exist yet (AWS is in procurement), so
// .env.production legitimately still carries the REPLACE_ME placeholder. Gating
// the daily build on a known-blocked infra item would just leave CI permanently
// red. It runs on release tags only — the one moment the placeholder actually
// matters — and can be run by hand any time via:
//
//     npm run verify:release-env --workspace=frontend/web/admin
//
// Env resolution uses Vite's own loadEnv, so what we check is exactly what the
// bundle would see: .env / .env.production / .env.production.local, with real
// process.env VITE_* vars taking precedence (that is how CI would inject the
// real host without editing the file).

import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadEnv } from 'vite';

// Resolve relative to this file, never the caller's cwd — the script is run
// both from the workspace (`npm run verify:release-env`) and from the repo root
// (`node frontend/web/admin/scripts/check-env.mjs`).
const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const MODE = 'production';
const env = loadEnv(MODE, projectRoot, 'VITE_');

const problems = [];

// ── VITE_API_URL: must exist and must not be the shipped placeholder ──────────
// Mirrors src/config.ts:37-42.
const apiUrl = env.VITE_API_URL;
if (!apiUrl) {
  problems.push(
    'VITE_API_URL is missing or empty.\n' +
      '    The panel has no API host to talk to and will throw on first load.\n' +
      '    Fix: set the real production host in .env.production, e.g.\n' +
      '         VITE_API_URL=https://api.fuehrer.in/api/v1',
  );
} else if (apiUrl.includes('REPLACE_ME')) {
  problems.push(
    `VITE_API_URL still contains the "REPLACE_ME" placeholder ("${apiUrl}").\n` +
      '    This is the shipped default — it was never filled in.\n' +
      '    Fix: set the real production host in .env.production, and update the\n' +
      '         connect-src host in nginx.conf to match.',
  );
}

// ── VITE_USE_MOCK: a prod bundle in mock mode is a demo panel ─────────────────
// Mirrors src/config.ts:19-23.
if (String(env.VITE_USE_MOCK ?? '').toLowerCase() === 'true') {
  problems.push(
    'VITE_USE_MOCK is "true" for a production build.\n' +
      '    That ships a demo panel wired to sample data, masquerading as the real\n' +
      '    back-office — staff could record "decisions" against fake loans.\n' +
      '    Fix: set VITE_USE_MOCK=false in .env.production.',
  );
}

// ── Report ───────────────────────────────────────────────────────────────────
if (problems.length > 0) {
  const plural = problems.length === 1 ? 'problem' : 'problems';
  console.error(`\nrelease env check FAILED — ${problems.length} ${plural} found\n`);
  problems.forEach((p, i) => console.error(`  ${i + 1}. ${p}\n`));
  console.error(
    'This build must not be released. See docs/FRONTEND_PLAN.md gate G1.\n',
  );
  process.exit(1);
}

console.log('release env OK');
