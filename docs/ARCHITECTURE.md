# Cryptographic Architecture

All cryptographic operations in seQRets run **entirely on your device**. Your secrets never leave your machine.

## How seQRets Works

### 🔒 Securing a Secret

1. **Detect** — if your secret is a BIP-39 seed phrase, it is converted to compact binary entropy (e.g., 24 words → 32 bytes) before processing
2. **Compress** — gzip (level 9) reduces the payload size to minimize QR code density
3. **Derive key** — your password + optional keyfile are run through Argon2id (64MB memory, 4 iterations) to produce a 256-bit encryption key
4. **Encrypt** — XChaCha20-Poly1305 encrypts the compressed data using a randomly generated 128-bit salt and 192-bit nonce
5. **Split** — Shamir's Secret Sharing divides the ciphertext into N shares with a threshold of T (e.g., 2-of-3)
6. **Output** — each share is encoded as a QR code (Qard); a Qard is computationally indistinguishable from random noise without the others

```
Secret → [BIP-39 optimize] → Compress → Argon2id → Encrypt → Shamir Split → Qards
```

### 🔓 Restoring a Secret

1. **Gather** — scan or import at least T Qards (the threshold)
2. **Reconstruct** — Shamir's algorithm recombines the shares into the full ciphertext
3. **Derive key** — the same password + keyfile are run through Argon2id again, producing the identical key
4. **Decrypt** — XChaCha20-Poly1305 decrypts and authenticates the data; any tampering causes an immediate authentication failure
5. **Decompress** — gunzip restores the original bytes
6. **Output** — your original secret, exactly as entered

```
T Qards → Shamir Reconstruct → Argon2id → Decrypt + Verify → Decompress → Secret
```

## Primitives

| Layer | Algorithm | Purpose |
|-------|-----------|---------|
| **Key Derivation** | Argon2id (64MB memory, 4 iterations, 32-byte key output) | Derive encryption key from password + optional keyfile |
| **Encryption** | XChaCha20-Poly1305 (AEAD) | Authenticated encryption with integrity verification |
| **Salt** | 16 random bytes (per operation) | Unique salt for each encryption — ensures distinct keys even with the same password |
| **Nonce** | 24 random bytes | Per-encryption nonce for XChaCha20 |
| **Splitting** | Shamir's Secret Sharing ([audited](https://github.com/privy-io/shamir-secret-sharing), zero-dependency) | Threshold-based secret splitting into Qards |
| **Compression** | Gzip (level 9) | Reduce payload size before encryption |
| **RNG** | OS-backed CSPRNG | **Desktop:** Rust `rand::thread_rng()` (OS entropy) for salts/nonces; `crypto.getRandomValues()` for passwords/keyfiles. **Web:** `crypto.getRandomValues()` for all operations. |
| **Memory** | Key zeroization | **Desktop:** Rust `zeroize` crate — compiler-fence guaranteed, optimizer-proof. Keys never cross the JS/Rust boundary. **Web:** `fill(0)` in `finally` blocks. Note: JS strings (passwords) cannot be zeroed — a browser/JS limitation. |

## Encrypt-First Architecture (Security by Design)

seQRets deliberately **encrypts first, then splits** — this ordering is a critical security choice:

```
Secret → Compress (gzip) → Encrypt (XChaCha20-Poly1305) → Split (Shamir's) → Distribute
```

Each Qard contains a fragment of the **encrypted** ciphertext — never raw plaintext. To recover the secret, an attacker must:

1. **Obtain** the required threshold of Qards (e.g., 2-of-3), AND
2. **Know** the password (+ keyfile, if used)

These are **layered defenses** — both must be defeated. The alternative design (split first, then encrypt each share individually) is weaker: each share becomes an independent encryption target, and cracking the password on a single share could reveal partial plaintext. With Encrypt→Split, a stolen Qard is computationally indistinguishable from random noise.

## Quantum Resistance

The built-in password generator produces passwords with ~10^62 possible combinations. Even with Grover's algorithm (optimal quantum speedup), brute-forcing would take:

- **Optimistic estimate:** ~2 × 10^18 years (148 million × the age of the universe)
- **Realistic estimate:** ~2 × 10^23 years (148 trillion × the age of the universe)

Argon2id's memory-hardness provides additional quantum resistance, and XChaCha20-Poly1305 maintains 128-bit effective quantum security as a defense-in-depth layer.

## Random Number Generation (CSPRNG)

All randomness in seQRets is sourced from a **Cryptographically Secure Pseudo-Random Number Generator (CSPRNG)** — the Web Crypto API's `crypto.getRandomValues()`, which draws from the operating system's entropy pool (`/dev/urandom` on Linux/macOS, `BCryptGenRandom` on Windows).

| Operation | Entropy | Method |
|-----------|---------|--------|
| **Seed phrase (12 words)** | 128 bits | `@scure/bip39` → `@noble/hashes randomBytes()` → `crypto.getRandomValues()` |
| **Seed phrase (24 words)** | 256 bits | `@scure/bip39` → `@noble/hashes randomBytes()` → `crypto.getRandomValues()` |
| **Password generation** | 32 × 32-bit values | `window.crypto.getRandomValues(new Uint32Array(32))` mapped to 88-char charset |
| **Keyfile generation** | 256 bits | `window.crypto.getRandomValues(new Uint8Array(32))` |
| **Encryption salt** | 128 bits (16 bytes) | Desktop: Rust `rand::thread_rng()` → OS entropy; Web: `@noble/hashes randomBytes()` → `crypto.getRandomValues()` |
| **Encryption nonce** | 192 bits (24 bytes) | Desktop: Rust `rand::thread_rng()` → OS entropy; Web: `@noble/hashes randomBytes()` → `crypto.getRandomValues()` |

No `Math.random()` or any other weak PRNG is used for any security-critical operation.

## BIP-39 Optimization

Seed phrases are automatically detected and converted to compact binary entropy before encryption. A 24-word phrase (~150 characters) becomes just 32 bytes, dramatically reducing QR code size.
