# Security Policy

## Supported Versions

| Version | Supported |
|---------|-----------|
| 1.10.x  | Yes       |
| < 1.10  | No        |

## Reporting a Vulnerability

If you discover a security vulnerability in seQRets, **please report it responsibly**. Do not open a public GitHub issue.

**Email:** [security@seqrets.app](mailto:security@seqrets.app)

Include as much of the following as possible:

- Description of the vulnerability
- Steps to reproduce
- Affected component (web app, desktop app, `@seqrets/crypto` library)
- Potential impact
- Suggested fix (if any)

## What to Expect

- **Acknowledgment** within 48 hours
- **Assessment and triage** within 7 days
- **Fix or mitigation** as soon as practical, depending on severity
- **Credit** in release notes (unless you prefer to remain anonymous)

## Scope

The following are in scope:

- Cryptographic implementation flaws (XChaCha20-Poly1305, Argon2id, Shamir's Secret Sharing)
- Secret or key material leakage (memory, DOM, network, logs)
- Share reconstruction with fewer than the required threshold
- Input validation bypasses
- Cross-site scripting (XSS) or injection in the web app
- Tauri IPC or privilege escalation in the desktop app

The following are **out of scope**:

- Vulnerabilities in upstream dependencies (report those to the upstream maintainer, but feel free to notify us)
- Browser extension threats (documented in README as a known limitation)
- Attacks requiring physical access to the user's device
- Social engineering

## Audit Status

seQRets has **not undergone a formal third-party security audit**. However, an internal security review was completed in v1.4.0, which identified and resolved 11 findings across the full desktop stack (Rust backend, TypeScript crypto library, Tauri frontend) — including CSP enforcement, clipboard auto-clear, API key migration to OS keychain, Rust password zeroization, and Argon2id iteration hardening. The cryptographic primitives used are industry-standard and well-audited (Noble, Scure libraries by Paul Miller; Shamir library audited by Cure53 + Zellic). A formal third-party audit of the application-level integration is planned.

## Cryptographic Source

All cryptographic code lives in a single file: [`packages/crypto/src/crypto.ts`](packages/crypto/src/crypto.ts) (~450 lines). Reviewers should start there — it contains every call to the underlying primitives. The desktop app additionally runs Argon2id and XChaCha20-Poly1305 natively in Rust via [`packages/desktop/src-tauri/src/crypto.rs`](packages/desktop/src-tauri/src/crypto.rs); derived keys never cross the JS/Rust boundary on desktop.

### Cryptographic Dependencies

| Library | Version | Maintainer | Purpose |
|---------|---------|------------|---------|
| [`@noble/ciphers`](https://github.com/paulmillr/noble-ciphers) | `0.4.0` | Paul Miller (`paulmillr`) | XChaCha20-Poly1305 AEAD |
| [`@noble/hashes`](https://github.com/paulmillr/noble-hashes) | `^1.4.0` | Paul Miller (`paulmillr`) | Argon2id, CSPRNG (`randomBytes`) |
| [`@scure/bip39`](https://github.com/paulmillr/scure-bip39) | `^1.3.0` | Paul Miller (`paulmillr`) | BIP-39 mnemonic validation & entropy conversion |
| [`shamir-secret-sharing`](https://github.com/privy-io/shamir-secret-sharing) | `^0.0.4` | Privy (`privy-io`) — audited by Cure53 + Zellic | Threshold secret splitting |
| [`pako`](https://github.com/nodeca/pako) | `^2.1.0` | Nodeca | Gzip compression (non-cryptographic) |

Noble and Scure are the de-facto reference implementations for these primitives in the JS ecosystem and are themselves audited. Exact versions are pinned in [`packages/crypto/package.json`](packages/crypto/package.json) and locked via `package-lock.json`.

### Key Zeroization

All derived keys, keyfile buffers, and intermediate decrypted/decompressed buffers are zeroed with `Uint8Array.fill(0)` inside `finally` blocks in `packages/crypto/src/crypto.ts` (see `deriveKey`, `createShares`, `restoreSecret`, `decryptInstructions`, `encryptVault`, `decryptVault`, `encryptInstructions`). On desktop, the Rust layer additionally uses the `zeroize` crate with compiler-fence guarantees. Note: JavaScript string primitives (the password itself) cannot be zeroed — this is a platform limitation, not an implementation choice.

## Security Design

For details on the cryptographic architecture, threat model, and security trade-offs, see [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) and [docs/THREAT_MODEL.md](docs/THREAT_MODEL.md).
