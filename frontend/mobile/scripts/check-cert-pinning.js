#!/usr/bin/env node
/**
 * check-cert-pinning.js
 *
 * Fails (exit 1) if any certificate-pinning value is still a REPLACE_* / empty
 * placeholder. Wire this into the store-build path (see .github/workflows/ci.yml
 * eas-build job) so a production/store build can never ship with pinning
 * silently disabled — the app is coded to fail *open* when placeholders remain
 * (see src/core/api/api.ts isPinningConfigured and
 * plugins/withCertificatePinning.js PINNING_CONFIGURED), which is convenient in
 * dev but a High-severity MITM exposure in a shipped build.
 *
 * Run locally with:  npm run check:pinning --workspace=frontend/mobile
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const API = path.join(ROOT, 'src', 'core', 'api', 'api.ts');
const PLUGIN = path.join(ROOT, 'plugins', 'withCertificatePinning.js');

const isPlaceholder = (v) => v == null || v === '' || v.includes('REPLACE');

/** Pull the single-quoted value assigned to `const NAME = '...'`. */
function constValue(src, name) {
  const m = src.match(new RegExp(`const\\s+${name}\\s*=\\s*'([^']*)'`));
  return m ? m[1] : null;
}

/** Pull every single-quoted string inside `NAME ... = [ ... ]`. */
function arrayValues(src, name) {
  const block = src.match(new RegExp(`${name}[^=]*=\\s*\\[([\\s\\S]*?)\\]`));
  if (!block) return null;
  return [...block[1].matchAll(/'([^']*)'/g)].map((m) => m[1]);
}

function read(file) {
  try {
    return fs.readFileSync(file, 'utf8');
  } catch {
    return null;
  }
}

const problems = [];
const checked = [];

const apiSrc = read(API);
if (apiSrc == null) {
  problems.push(`Cannot read ${path.relative(ROOT, API)}`);
} else {
  const hostname = constValue(apiSrc, 'PINNED_HOSTNAME');
  const hashes = arrayValues(apiSrc, 'SSL_PINNED_HASHES');
  const entries = [['api.ts PINNED_HOSTNAME', hostname]];
  if (hashes == null) {
    problems.push('api.ts SSL_PINNED_HASHES — could not parse');
  } else {
    hashes.forEach((h, i) => entries.push([`api.ts SSL_PINNED_HASHES[${i}]`, h]));
  }
  for (const [label, value] of entries) {
    checked.push(label);
    if (isPlaceholder(value)) problems.push(`${label} = ${JSON.stringify(value)}`);
  }
}

const pluginSrc = read(PLUGIN);
if (pluginSrc == null) {
  problems.push(`Cannot read ${path.relative(ROOT, PLUGIN)}`);
} else {
  for (const name of ['PINNED_DOMAIN', 'PRIMARY_HASH', 'BACKUP_HASH']) {
    const value = constValue(pluginSrc, name);
    const label = `withCertificatePinning.js ${name}`;
    checked.push(label);
    if (isPlaceholder(value)) problems.push(`${label} = ${JSON.stringify(value)}`);
  }
}

if (problems.length > 0) {
  console.error('✖ Certificate pinning is NOT configured — store build blocked.\n');
  console.error('  Unresolved placeholders:');
  for (const p of problems) console.error(`    • ${p}`);
  console.error(
    '\n  Generate the real SHA-256 SPKI hashes for the production API domain and\n' +
      '  paste them into src/core/api/api.ts AND plugins/withCertificatePinning.js\n' +
      '  before building for the store. See the header comment in either file.',
  );
  process.exit(1);
}

console.log(`✔ Certificate pinning configured (${checked.length} values checked, no placeholders).`);
