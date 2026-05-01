#!/usr/bin/env node
// Bump the version + codename across the 5 mechanical files that a release
// actually needs touched, then regenerate lockfiles.
//
// Usage:
//   npm run bump -- 1.10.7            # keep current codename
//   npm run bump -- 1.10.7 Liftoff    # change codename
//
// Everything else (UI footers, about pages, service worker, Bob prompts) now
// reads the version from scripts/generate-version.mjs output at build time,
// so this script no longer touches those files. Prose docs that need human
// judgment per release are printed as an advisory checklist at the end.

import { readFileSync, writeFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

const [, , newVersion, newCodenameArg] = process.argv;

if (!newVersion || !/^\d+\.\d+\.\d+$/.test(newVersion)) {
  console.error('Usage: npm run bump -- <x.y.z> [codename]');
  process.exit(1);
}

const rootPkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'));
const oldVersion = rootPkg.version;
const oldCodename = rootPkg.codename;

if (!oldCodename) {
  console.error('Root package.json is missing the `codename` field.');
  process.exit(1);
}

const newCodename = newCodenameArg || oldCodename;

if (oldVersion === newVersion && oldCodename === newCodename) {
  console.error(`Already at v${newVersion} "${newCodename}" — nothing to do.`);
  process.exit(1);
}

console.log(`\nBumping v${oldVersion} "${oldCodename}" → v${newVersion} "${newCodename}"\n`);

// The five files below are the ONLY files that need mechanical edits per
// release. Workspaces need their own `version` (for `workspace:*` resolution
// and npm publish semantics), Cargo.toml has its own versioning, and
// tauri.conf.json is read by the Tauri updater. Everything else derives from
// the root package.json at build time.
const edits = [
  // Root package: version + codename (the only two lines anyone should ever
  // edit on release day; generate-version.mjs picks both up).
  ['package.json',                                `"version": "${oldVersion}"`,                `"version": "${newVersion}"`],
  ['package.json',                                `"codename": "${oldCodename}"`,              `"codename": "${newCodename}"`],

  // Workspace manifests.
  ['packages/crypto/package.json',                `"version": "${oldVersion}"`,                `"version": "${newVersion}"`],
  ['packages/desktop/package.json',               `"version": "${oldVersion}"`,                `"version": "${newVersion}"`],

  // Rust / Tauri (Cargo can't read JSON, so these stay scripted).
  ['packages/desktop/src-tauri/Cargo.toml',       `version = "${oldVersion}"`,                 `version = "${newVersion}"`],
  ['packages/desktop/src-tauri/tauri.conf.json',  `"version": "${oldVersion}"`,                `"version": "${newVersion}"`],
];

const failures = [];
for (const [file, from, to] of edits) {
  const path = join(ROOT, file);
  const src = readFileSync(path, 'utf8');
  if (!src.includes(from)) {
    failures.push({ file, from });
    continue;
  }
  writeFileSync(path, src.replace(from, to));
  console.log(`  ✓ ${file}`);
}

if (failures.length) {
  console.error('\n❌ Could not locate expected pattern in:');
  for (const { file, from } of failures) {
    console.error(`   - ${file}`);
    console.error(`     expected: ${from}`);
  }
  console.error('\nNo lockfile regeneration attempted. Fix the patterns (or revert edits) before re-running.');
  process.exit(1);
}

console.log('\nRegenerating package-lock.json...');
execSync('npm install --package-lock-only', { cwd: ROOT, stdio: 'inherit' });

console.log('\nRegenerating Cargo.lock...');
execSync('cargo generate-lockfile', { cwd: join(ROOT, 'packages/desktop/src-tauri'), stdio: 'inherit' });

console.log(`\n✅ Bumped to v${newVersion} "${newCodename}".`);

console.log(`
Stale-doc review checklist — these aren't auto-updated, please eyeball
before releasing:

  [ ] docs/SECURITY_ANALYSIS.md  — Audit Date header + "App Version" line
  [ ] docs/ARCHITECTURE.md       — any version-tied claims still accurate?
  [ ] SECURITY.md                — Supported Versions table — any rows to retire?
  [ ] CLAUDE.md                  — sync rules still accurate?

Review \`git diff\`, then commit.
`);
