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

## Optional Keyfile (Second Factor)

seQRets supports an optional **keyfile** as a second factor alongside the password. When used, both the password AND the keyfile are required to derive the encryption key — one without the other is useless.

### How it works

A keyfile is a **32-byte (256-bit) random value** generated from the OS CSPRNG (`crypto.getRandomValues`) and stored as base64. During key derivation, the keyfile bytes are appended to the password bytes, and the concatenated buffer is fed into Argon2id as the secret input:

```
argon2id(password_bytes || keyfile_bytes, salt, 64MB, 4 iters) → 256-bit key
```

The salt is still randomly generated per-operation, so two encryptions with the same password + keyfile pair produce different keys. Restoration requires the exact same password AND the exact same keyfile bytes — there is no "recovery mode" that accepts one without the other.

### Why it matters

- **Defense in depth** — an attacker who compromises your password (phishing, keylogger, shoulder-surf) still cannot decrypt without the keyfile
- **Physical/digital split** — store the keyfile on a different medium than the password (keyfile on a smart card, password memorized; or keyfile in a password manager, password on paper)
- **Brute-force resistance** — even a weak password becomes computationally infeasible to guess when concatenated with 256 bits of unknown random data
- **Coercion resistance** — if the keyfile is stored somewhere you cannot physically reach (safe deposit box, another jurisdiction, a trusted party), you genuinely cannot decrypt on demand. See [THREAT_MODEL.md](THREAT_MODEL.md#threats-mitigated-by-the-optional-keyfile) for a full breakdown.

### Storage and distribution

- **Download** — save as a `.bin` file to any location (USB, encrypted drive, printed as a QR code, etc.)
- **Smart card** (desktop only) — write to a JavaCard alongside shares, vaults, or inheritance plans; load from the card anywhere a keyfile is accepted
- **Generate or upload** — create a fresh keyfile with the built-in generator, or bring your own

### Operational caveats

- **Losing the keyfile = losing the secret.** There is no recovery path. Treat the keyfile with the same care as a hardware wallet seed — back it up to multiple locations.
- **Keyfile ≠ password.** The keyfile does not replace the password; both are required. Do not reuse the same keyfile across unrelated secrets unless you want them to share the same second factor.
- **Keyfile bytes are zeroized after use** on both platforms (`fill(0)` on web, Rust `zeroize` on desktop).

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

**The seQRets scheme is quantum-resistant under its own assumptions.** While fewer than K shares are in an adversary's possession, the ciphertext is never reconstructed — so no quantum (or classical) attack has anything to attack in the first place.

### The scheme-level argument

Shamir's Secret Sharing is **information-theoretically secure**: with K-1 or fewer shares, an adversary has literally zero bits of information about the secret. This is not a computational assumption that a faster computer can break — it is a mathematical property of polynomial interpolation over finite fields. No quantum computer changes this. Grover's algorithm doesn't apply, Shor's algorithm doesn't apply, and no future quantum breakthrough can apply, because there is no hidden structure to exploit.

Because the ciphertext is only reconstructable once the threshold is met, the XChaCha20-Poly1305 layer is never attacked at all under the primary threat model (< K shares compromised). Its quantum vulnerability is irrelevant in that regime.

### XChaCha20-Poly1305 as defense-in-depth

The only scenario in which the symmetric cipher's quantum resistance matters is **after scheme failure** — i.e., an attacker has already obtained ≥ K shares and can reconstruct the ciphertext. That scenario represents a failure of the share distribution, not a failure of the cryptography. Even in that failure mode, the cipher layer continues to provide post-quantum security margin:

- **XChaCha20-Poly1305** — 256-bit key provides ~128-bit effective post-quantum security under Grover's algorithm
- **Argon2id** — memory-hardness (64 MB, 4 iterations) further raises the cost of brute-forcing the password
- **Password entropy** — the built-in generator produces passwords with ~10^62 possible combinations, putting Grover-accelerated brute-force beyond any realistic attacker:
  - **Optimistic estimate:** ~2 × 10^18 years (148 million × the age of the universe)
  - **Realistic estimate:** ~2 × 10^23 years (148 trillion × the age of the universe)

### Honest framing

seQRets is not "fully post-quantum secure in all scenarios." The honest framing is:

- ✅ **Scheme intact (< K shares compromised)** → quantum-resistant by information-theoretic argument, independent of any computational assumption
- ⚠️ **Scheme failed (≥ K shares compromised)** → falls back to XChaCha20-Poly1305 + Argon2id, which provides ~128-bit post-quantum security margin as defense-in-depth

If the share distribution is designed correctly, the second scenario should never occur in practice.

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
