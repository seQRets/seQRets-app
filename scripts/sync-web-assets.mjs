#!/usr/bin/env node
/**
 * Sync shared binary assets from packages/desktop/src/assets/ into public/
 * so the Next.js web app can serve them at runtime.
 *
 * The canonical source of truth is packages/desktop/src/assets/.
 * The copies in public/ are build artifacts and are gitignored.
 *
 * Why: Next.js 16 / Turbopack does not support arbitrary binary imports
 * (e.g. .mp3) without adding a webpack-loader compatibility shim.
 * Vite (desktop) imports them natively. Rather than ship two copies of
 * each asset and remember to keep them in sync by hand, we copy from
 * the desktop assets dir into public/ before each web dev/build.
 */

import { copyFileSync, mkdirSync, existsSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const sourceDir = join(repoRoot, 'packages/desktop/src/assets');
const targetDir = join(repoRoot, 'public');

// Files to mirror from desktop assets into public/
// Audio assets used by drag-and-drop callbacks in the web app.
const ASSETS = ['sound.mp3', 'Alternate_sound.mp3'];

mkdirSync(targetDir, { recursive: true });

let copied = 0;
let skipped = 0;
for (const name of ASSETS) {
  const src = join(sourceDir, name);
  const dst = join(targetDir, name);
  if (!existsSync(src)) {
    console.error(`sync-web-assets: missing source ${src}`);
    process.exit(1);
  }
  // Skip if destination is already up-to-date (same mtime + size)
  if (existsSync(dst)) {
    const s = statSync(src);
    const d = statSync(dst);
    if (s.size === d.size && Math.abs(s.mtimeMs - d.mtimeMs) < 1) {
      skipped++;
      continue;
    }
  }
  copyFileSync(src, dst);
  copied++;
}

console.log(`sync-web-assets: ${copied} copied, ${skipped} unchanged`);
