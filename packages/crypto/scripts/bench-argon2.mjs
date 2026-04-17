// Benchmarks the exact argon2id call the web worker performs.
// Resolves the crypto package from its local node_modules (1.4.0).

import { argon2id } from '@noble/hashes/argon2';
import { readFileSync } from 'node:fs';

const pkg = JSON.parse(
  readFileSync(new URL('../node_modules/@noble/hashes/package.json', import.meta.url), 'utf8'),
);
console.log('Using @noble/hashes version:', pkg.version);

const password = new TextEncoder().encode('test-password-123');
const salt = Buffer.from('z7XSp8SF7GpHj5y5xnGIEw==', 'base64');

// Warm-up (JIT effects)
await argon2id(password, salt, { m: 65536, t: 4, p: 1, dkLen: 32 });

const t0 = performance.now();
const key = await argon2id(password, salt, { m: 65536, t: 4, p: 1, dkLen: 32 });
const t1 = performance.now();

console.log(`Argon2id m=65536 t=4 p=1 → ${Math.round(t1 - t0)}ms`);
console.log('First 8 bytes of key:', Buffer.from(key.slice(0, 8)).toString('hex'));
