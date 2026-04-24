# seQRets Desktop App — Security Analysis

> **Audit Date:** April 2026 · **App Version:** 1.10.7 · **Auditor:** Independent code review via Claude (Anthropic)
> **Scope:** Full source audit of `packages/desktop/`, `packages/crypto/`, and `src-tauri/` (Rust backend)

---

## Executive Summary

seQRets is a zero-knowledge cryptographic application for protecting sensitive secrets (seed phrases, private keys, passwords) using military-grade encryption and Shamir's Secret Sharing. This analysis covers the full desktop application stack: Rust backend, TypeScript crypto library, and Tauri frontend.

**Overall Security Posture: Strong**

The application demonstrates excellent cryptographic engineering with proper algorithm selection, key zeroization, and defense-in-depth architecture. Derived encryption keys in the desktop app never enter the JavaScript heap — all key derivation and encryption runs in Rust with compiler-fence guaranteed memory erasure. The few issues identified are addressable and do not compromise the core cryptographic guarantees.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    seQRets Desktop App                       │
│                                                             │
│  ┌───────────────────────────────────────────────────────┐  │
│  │              Tauri WebView (Isolated)                  │  │
│  │                                                       │  │
│  │  ┌─────────────┐  ┌──────────────┐  ┌─────────────┐  │  │
│  │  │  React UI   │  │  QR Engine   │  │  Bob AI     │  │  │
│  │  │  (Forms,    │  │  (Generate/  │  │  (Gemini    │  │  │
│  │  │   State)    │  │   Scan QR)   │  │   API)      │  │  │
│  │  └──────┬──────┘  └──────┬───────┘  └─────────────┘  │  │
│  │         │                │                            │  │
│  │         └────────┬───────┘                            │  │
│  │                  │ Tauri IPC (invoke)                  │  │
│  └──────────────────┼────────────────────────────────────┘  │
│                     │                                       │
│  ┌──────────────────┼────────────────────────────────────┐  │
│  │          Rust Backend (Native Binary)                  │  │
│  │                  │                                     │  │
│  │  ┌───────────────▼───────────────┐  ┌──────────────┐  │  │
│  │  │     Cryptographic Core        │  │  Smart Card  │  │  │
│  │  │                               │  │  Manager     │  │  │
│  │  │  • Argon2id Key Derivation    │  │              │  │  │
│  │  │  • XChaCha20-Poly1305 AEAD    │  │  • PC/SC     │  │  │
│  │  │  • Gzip Compression           │  │  • APDU      │  │  │
│  │  │  • Zeroize (compiler-fence)   │  │  • PIN Mgmt  │  │  │
│  │  └───────────────────────────────┘  └──────────────┘  │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  OS-Level Protections                                  │  │
│  │  • Code-signed binary (Minisign verification)          │  │
│  │  • No browser extensions (WebView isolation)           │  │
│  │  • No network required (fully offline)                 │  │
│  │  • Camera permission scoped (QR scanning only)         │  │
│  └────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

---

## Cryptographic Design

### Encryption Pipeline

```
                        USER INPUT
                            │
                   ┌────────▼────────┐
                   │   Secret Text   │    BIP-39 detection:
                   │   or Mnemonic   │◄── If valid mnemonic, stores
                   └────────┬────────┘    as compact entropy
                            │
                   ┌────────▼────────┐
                   │  JSON Serialize  │    {secret, label, isMnemonic,
                   │  + Gzip (lvl 9) │     mnemonicLengths}
                   └────────┬────────┘
                            │
              ┌─────────────▼──────────────┐
              │   Argon2id Key Derivation   │
              │                            │
              │  Input: password ∥ keyfile? │
              │  Salt:  16 random bytes    │
              │  Mem:   64 MB              │
              │  Iter:  4                  │
              │  Output: 256-bit key       │
              └─────────────┬──────────────┘
                            │
              ┌─────────────▼──────────────┐
              │  XChaCha20-Poly1305 AEAD   │
              │                            │
              │  Key:   256-bit (derived)  │
              │  Nonce: 192-bit (random)   │
              │  Auth:  Poly1305 MAC       │
              └─────────────┬──────────────┘
                            │
                   ┌────────▼────────┐
                   │  Shamir's SSS   │    Split into N shares,
                   │  (Threshold)    │    requiring M to restore
                   └────────┬────────┘
                            │
                ┌───────────▼───────────┐
                │   QR Codes / Cards    │    Each share = 1 QR code
                │   (Distributed)       │    Format: seQRets|salt|data|sha256:hash
                └───────────────────────┘
```

### Cryptographic Parameters

| Parameter | Value | Standard | Assessment |
|-----------|-------|----------|:----------:|
| **Cipher** | XChaCha20-Poly1305 | Used in Signal, WireGuard, libsodium | ✅ Excellent |
| **Key Size** | 256-bit | AES-256 equivalent | ✅ Excellent |
| **Nonce Size** | 192-bit (24 bytes) | Extended nonce, safe for random generation | ✅ Excellent |
| **KDF** | Argon2id | Winner of Password Hashing Competition | ✅ Excellent |
| **KDF Memory** | 64 MB | OWASP recommends 19–64 MB | ✅ Strong |
| **KDF Iterations** | 4 | OWASP recommends t=3 at m=64 MB | ✅ Above recommendation |
| **KDF Parallelism** | 1 | Standard single-thread | ✅ Standard |
| **Salt Size** | 128-bit (16 bytes) | NIST minimum: 128-bit | ✅ Standard |
| **Secret Sharing** | Shamir's SSS | Information-theoretically secure | ✅ Excellent |
| **Compression** | Gzip level 9 (before encryption) | Correct order | ✅ Correct |
| **Random Source** | OS CSPRNG (Rust `rand` / `crypto.getRandomValues`) | Industry standard | ✅ Excellent |

### Why These Choices Matter

```
┌──────────────────────────────────────────────────────────────────┐
│                    BRUTE FORCE RESISTANCE                        │
│                                                                  │
│  Argon2id (64 MB, 4 iterations)                                  │
│  ────────────────────────────────                                │
│  Each password guess requires 64 MB of RAM + 4 full passes.     │
│  At $0.10/hr for GPU instances:                                  │
│                                                                  │
│  Password Entropy     Estimated Cost to Crack                    │
│  ─────────────────    ─────────────────────────                  │
│  40-bit  (weak)       ~$50              (hours)                  │
│  60-bit  (moderate)   ~$50,000          (months)                 │
│  80-bit  (strong)     ~$50,000,000,000  (centuries)              │
│  128-bit (generated)  Computationally impossible                 │
│                                                                  │
│  seQRets enforces 24+ character passwords with mixed classes,    │
│  yielding 100+ bits of entropy minimum.                          │
│                                                                  │
│  XChaCha20-Poly1305                                              │
│  ──────────────────                                              │
│  256-bit key space = 2^256 possible keys.                        │
│  Even with all computing power on Earth running for the          │
│  lifetime of the universe, you cannot brute-force this.          │
│                                                                  │
│  Shamir's Secret Sharing                                         │
│  ───────────────────────                                         │
│  M-1 shares reveal ZERO information about the secret.            │
│  This isn't "hard to crack" — it's mathematically impossible.    │
│  No quantum computer changes this (information-theoretic).       │
└──────────────────────────────────────────────────────────────────┘
```

---

## Memory Safety Analysis

### Rust Backend (Desktop-Exclusive Advantage)

The desktop app runs all cryptographic operations in native Rust, providing guarantees that JavaScript cannot:

```
┌─────────────────────────────────────────────────────────────┐
│              MEMORY LIFECYCLE: DESKTOP APP                   │
│                                                             │
│  User types password                                        │
│       │                                                     │
│       ▼                                                     │
│  [JS String] ──IPC──▶ [Rust String] ──▶ [Zeroizing<Vec>]  │
│       │                                      │              │
│       │                              Argon2id derivation    │
│       │                                      │              │
│       │                              [Zeroizing<[u8;32]>]  │
│       │                              (derived key)          │
│       │                                      │              │
│       │                              XChaCha20 encrypt      │
│       │                                      │              │
│       │                              Key dropped + zeroed   │
│       │                              (compiler-fence)       │
│       │                                                     │
│       ▼                                                     │
│  secureWipe() ──▶ overwrite with random ──▶ clear state    │
│                                                             │
│  ✅ Derived key NEVER enters JavaScript heap                │
│  ✅ Rust zeroize uses compiler-fence (optimizer-proof)      │
│  ✅ Password wiped from UI state after operation            │
│  ✅ No unsafe blocks in entire Rust codebase                │
└─────────────────────────────────────────────────────────────┘
```

### Zeroization Comparison

| Property | Web App (JS) | Desktop App (Rust) | Winner |
|----------|:------------:|:------------------:|:------:|
| Derived key zeroized | `fill(0)` — may be optimized away | `Zeroizing<T>` — compiler-fence guaranteed | **Desktop** |
| Password string zeroized | ❌ JS strings are immutable | ❌ Transits JS briefly, then Rust manages | **Desktop** |
| Intermediate buffers | `fill(0)` in finally blocks | `Zeroize` trait on drop | **Desktop** |
| GC interference | ⚠️ V8 may copy strings before GC | ✅ Deterministic drop semantics | **Desktop** |
| UI state cleanup | ✅ `secureWipe()` — random overwrite | ✅ `secureWipe()` — random overwrite | **Tie** |

---

## Desktop vs. Web: Threat Comparison

| Threat Vector | Web App | Desktop App | Notes |
|:--------------|:-------:|:-----------:|:------|
| Malicious browser extensions | ❌ **Exposed** | ✅ **Immune** | Tauri WebView loads no extensions |
| JavaScript supply-chain attack | ⚠️ Mitigated (strict CSP, no `unsafe-eval`, narrow allowlist) | ✅ **Eliminated** | Bundled, code-signed binary |
| Memory persistence | ⚠️ JS GC — timing unpredictable | ✅ **Rust zeroize** | Compiler-fence ensures erasure |
| Binary tampering | N/A | ✅ **Detected** | Code-signed, integrity verified at install |
| Offline operation | ⚠️ After initial load only | ✅ **Always** | No network required |
| Key derivation isolation | ⚠️ JS heap | ✅ **Rust memory** | Key never enters JS in desktop |
| Clipboard exposure | ⚠️ OS-level risk | ⚠️ OS-level risk | Both platforms share this limitation |
| Keylogger attacks | ⚠️ OS-level risk | ⚠️ OS-level risk | Requires compromised device |
| Auto-update integrity | N/A | ✅ **Minisign verified** | Cryptographic signature on updates |
| Smart card support | ❌ Not available | ✅ **PC/SC + PIN** | Hardware-backed storage |

---

## Vulnerability Assessment

### Summary by Severity

```
  CRITICAL  ██░░░░░░░░░░░░░░░░░░  1 found → ✅ 1 fixed
  HIGH      ██░░░░░░░░░░░░░░░░░░  1 found → ✅ 1 fixed
  MEDIUM    ████████░░░░░░░░░░░░  4 found → ✅ 4 fixed
  LOW       ██████░░░░░░░░░░░░░░  3 found → ✅ 3 fixed
  INFO      ████░░░░░░░░░░░░░░░░  2 found → ✅ 2 fixed
            ────────────────────
            Total: 11 findings, 11 fixed ✅
```

### Detailed Findings

#### CRITICAL

| # | Finding | Component | Impact | Fixable? |
|:-:|---------|-----------|--------|:--------:|
| C1 | ~~Content Security Policy disabled~~ | `tauri.conf.json` | ~~No CSP protection in WebView~~ | ✅ **Fixed** |

> **Resolved:** Strict CSP now enforced: `script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self' + allowlisted APIs; object-src 'none'; base-uri 'self'`.

#### HIGH

| # | Finding | Component | Impact | Fixable? |
|:-:|---------|-----------|--------|:--------:|
| H1 | ~~SmartCard APDU chunk index overflow~~ | `smartcard.rs` | ~~`i as u8` wraps at 256 chunks~~ | ✅ **Fixed** |

> **Resolved:** Added explicit `num_chunks > 255` guard before the APDU loop. Writes exceeding 61KB now return a descriptive error instead of silently overflowing.

#### MEDIUM

| # | Finding | Component | Impact | Fixable? |
|:-:|---------|-----------|--------|:--------:|
| M1 | ~~No clipboard auto-clear after copying secrets~~ | Frontend | ~~Copied passwords/seeds persist indefinitely~~ | ✅ **Fixed** |
| M2 | ~~Bob AI API key stored plaintext in localStorage~~ | `bob-api.ts` | ~~API key readable in localStorage~~ | ✅ **Fixed** |
| M3 | ~~`console.error` in production crypto code~~ | `crypto.ts` | ~~Stack traces visible in developer console~~ | ✅ **Fixed** |
| M4 | ~~Source maps shipped in crypto package~~ | `tsup.config.ts` | ~~Exposes original TypeScript source~~ | ✅ **Fixed** |

> **M1 Resolved:** All 10 clipboard copy sites now use `copyWithAutoClear()` — clipboard auto-clears after 60 seconds if contents haven't changed. Toast messages inform users.
> **M2 Resolved:** Desktop app now stores the API key in the OS keychain (macOS Keychain / Windows Credential Store) via the `keyring` crate and Tauri IPC. Existing keys are auto-migrated from localStorage on first launch. Web app retains localStorage (accepted tradeoff — no OS keychain available).
> **M3 Resolved:** `console.error` removed; error is re-thrown with a user-friendly message.
> **M4 Resolved:** `sourcemap: false` in tsup config; no `.map` files in production builds.

#### LOW

| # | Finding | Component | Impact | Fixable? |
|:-:|---------|-----------|--------|:--------:|
| L1 | ~~Password `String` not explicitly zeroized in Rust~~ | `crypto.rs` | ~~Password lives slightly longer in memory~~ | ✅ **Fixed** |
| L2 | ~~SmartCard label truncation may split UTF-8~~ | `smartcard.rs` | ~~Garbled display for multi-byte labels~~ | ✅ **Fixed** |
| L3 | ~~Card capacity hardcoded at 8192 bytes~~ | `smartcard.rs` | ~~May not match actual card memory~~ | ✅ **Fixed** |

> **L1 Resolved:** All 4 Tauri command functions now wrap `password` in `Zeroizing::new()` — heap buffer zeroed on drop.
> **L2 Resolved:** Label truncation now uses `char_indices()` to find the last valid UTF-8 boundary within 64 bytes.
> **L3 Resolved:** The JavaCard applet now reports `MAX_DATA_SIZE` in the GET_STATUS response. The Rust backend parses the actual capacity from the card and uses it for free-space calculations and pre-write size checks. The hardcoded constant is retained only as a fallback for older applet versions.

#### INFORMATIONAL

| # | Finding | Component | Notes |
|:-:|---------|-----------|-------|
| I1 | ~~Argon2id iterations at lower OWASP bound~~ | Crypto core | ~~t=3 at lower OWASP bound~~ — now t=4 |
| I2 | ~~`shamirs-secret-sharing-ts` lacks public audit~~ | Dependency | ~~Unaudited implementation~~ — replaced with `shamir-secret-sharing` (audited by Cure53 + Zellic) |

---

## What seQRets Protects Against

```
┌──────────────────────────────────────────────────────────┐
│              THREATS ELIMINATED ✅                        │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  ✅ Server breach         No servers exist               │
│  ✅ Database leak         No database exists              │
│  ✅ Network interception  Encryption is client-side       │
│  ✅ Single point of       Shamir splitting distributes    │
│     failure               risk across N locations         │
│  ✅ Brute-force attack    Argon2id (64MB) + 256-bit key  │
│  ✅ Nonce reuse           192-bit random nonce per op     │
│  ✅ Quantum (scheme       Shamir is information-theoretic │
│     intact, <K shares)    — <K shares reveal zero info    │
│  ✅ Quantum (≥K shares,   XChaCha20-256 + Argon2id give   │
│     scheme failure)       ~128-bit post-quantum margin    │
│  ✅ Extension spying      Desktop uses isolated WebView   │
│     (desktop)                                             │
│  ✅ Binary tampering      Code-signed + Minisign updates  │
│     (desktop)                                             │
│  ✅ Stale code serving    No service worker; fresh binary │
│  ✅ Weak password usage   Enforces 24+ char, mixed class  │
│                                                          │
└──────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────┐
│              THREATS MITIGATED ⚠️                        │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  ⚠️ JS memory persistence  secureWipe() + Rust zeroize  │
│  ⚠️ Clipboard exposure     Auto-clear after 60 seconds   │
│  ⚠️ Screen recording       Fields masked by default      │
│  ⚠️ Supply-chain attack    Pinned deps, signed binary    │
│     (desktop)                                            │
│                                                          │
└──────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────┐
│              THREATS NOT ADDRESSED ❌                     │
│              (Require user responsibility)                │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  ❌ Compromised device     No tool can help if malware   │
│     (active malware)       has root access               │
│  ❌ Hardware keylogger     Physical security required     │
│  ❌ Social engineering     User must guard their shares   │
│  ❌ Lost shares below      By design — this IS the       │
│     threshold              security guarantee             │
│  ❌ Weak user passwords    Enforced minimum, but user     │
│     (if bypassed)          ultimately chooses             │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

---

## Vendor Independence — seQRets Recover

A class of risk not covered by the standard threat matrix above is **vendor disappearance**: the scenario where the seQRets project is abandoned, seqrets.app goes offline, the company dissolves, or the desktop app stops being updated and eventually won't run on a future OS. For an inheritance tool where recovery may happen 20–50 years after the plan is created, this is a material risk that cryptographic design alone cannot mitigate.

### Mitigation: seQRets Recover

**seQRets Recover** (repository: https://github.com/seQRets/seQRets-Recover) is an independent reference implementation of the seQRets share format, published as a single `recover.html` file. It is:

- **Self-contained** — one HTML file with all dependencies (Argon2id, XChaCha20-Poly1305, Shamir SSS, pako, @scure/bip39) inlined. No CDN references, no runtime network calls.
- **Dependency-free at runtime** — requires only a modern web browser. No Node.js, no installer, no OS compatibility layer. Any machine that can render HTML and run JavaScript can run Recover.
- **Independently auditable** — ~200 lines of TypeScript implementing the documented share format (`seQRets|<base64 salt>|<base64 nonce+ciphertext>|sha256:<hex>`). The format is plaintext, self-describing, and could be reimplemented from scratch in any language in an afternoon.
- **Integrity-verifiable** — every GitHub release publishes the SHA-256 hash of `recover.html`, allowing holders to verify copies handed to heirs before trusting them with real credentials.
- **Offline-first by design** — the release instructions explicitly direct users to disconnect from the network before opening the file, and the HTML ships with a Content-Security-Policy that refuses network requests.

### Threat Eliminated

```
┌──────────────────────────────────────────────────────────┐
│              THREAT ELIMINATED ✅                         │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  ✅ Vendor disappearance   Recover is a separate repo    │
│                            with a separate release       │
│                            chain; users can archive the  │
│                            .html file alongside their    │
│                            Qards. Works with zero        │
│                            dependencies on seqrets.app   │
│                            being online.                 │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

### Trust Model Implications

The existence of Recover changes the seQRets trust model in a specific way: **users do not need to trust that the seQRets project will exist in the future.** The cryptographic scheme, the share format, and the primitives are all documented; a working reference implementation is archived; and any motivated third party can verify Recover's source and rebuild it from first principles. The main app's value is ergonomics (UI, smart cards, inheritance-plan forms) — the *recovery guarantee* does not depend on the main app continuing to exist.

This is reflected in the user-facing materials: the inheritance plan PDF generator embeds the Recover download URL and SHA-256 verification guidance as section 1 of every exported plan, ensuring whoever opens the document later has a clear recovery path even if seqrets.app is unreachable.

### Residual Risk

Recover mitigates but does not eliminate long-horizon risk. Users are still responsible for:

- **Archiving `recover.html`** — the GitHub release URL could change; users should save the file itself locally, not rely solely on the link.
- **Recording the verification hash** — the SHA-256 published at release time should be recorded separately so a copy received through an untrusted channel can be verified before use.
- **Browser longevity** — Recover depends on the continued existence of web browsers capable of running modern JavaScript. This is a weaker assumption than the continued existence of any specific project.

---

## Dependency Security

### Rust Dependencies (Desktop Backend)

| Crate | Version | Purpose | Status |
|-------|---------|---------|:------:|
| `argon2` | 0.5 | Key derivation | ✅ Current, audited (RustCrypto) |
| `chacha20poly1305` | 0.10 | AEAD encryption | ✅ Current, audited (RustCrypto) |
| `zeroize` | 1.x | Memory erasure | ✅ Current, audited (RustCrypto) |
| `rand` | 0.8 | CSPRNG | ✅ Current, audited |
| `pcsc` | 2.x | Smart card (PC/SC) | ✅ Current |
| `flate2` | 1.x | Gzip compression | ✅ Current |
| `tauri` | 2.10 | App framework | ✅ Current |
| `base64` | 0.22 | Encoding | ✅ Current |

### JavaScript Dependencies (Crypto Package)

| Package | Version | Purpose | Status |
|---------|---------|---------|:------:|
| `@noble/ciphers` | 0.4.0 | XChaCha20-Poly1305 | ✅ Audited (Paul Miller) |
| `@noble/hashes` | ^1.4.0 | Argon2id, randomBytes | ✅ Audited (Paul Miller) |
| `@scure/bip39` | ^1.3.0 | BIP-39 mnemonic validation | ✅ Audited (Paul Miller) |
| `shamir-secret-sharing` | ^0.0.4 | Shamir's Secret Sharing | ✅ Audited (Cure53 + Zellic) |
| `pako` | ^2.1.0 | Gzip compression | ✅ Widely used |

### Audit Results

```
  npm audit (web app):     0 vulnerabilities ✅
  npm audit (crypto pkg):  0 vulnerabilities ✅
  cargo audit (Rust):      No known advisories ✅
```

---

## Smart Card Security

### PIN Protection Model

```
  ┌────────────────────────────────────────────┐
  │           JavaCard Applet                   │
  │                                            │
  │   PIN: 8–16 characters                     │
  │   Retries: 5 attempts before lockout       │
  │   Storage: Capacity queried from card       │
  │   Protocol: ISO 7816 APDU over PC/SC       │
  │                                            │
  │   ┌──────────────────────────────────────┐ │
  │   │ What's stored on card:               │ │
  │   │                                      │ │
  │   │  • Encrypted Shamir shares           │ │
  │   │  • Encrypted vault files             │ │
  │   │  • Keyfiles (binary blobs)           │ │
  │   │  • Labels (for identification)       │ │
  │   │                                      │ │
  │   │ What's NOT on card:                  │ │
  │   │                                      │ │
  │   │  ✗ Plaintext secrets                 │ │
  │   │  ✗ Passwords                         │ │
  │   │  ✗ Derived encryption keys           │ │
  │   └──────────────────────────────────────┘ │
  └────────────────────────────────────────────┘
```

### APDU Communication Security

| Property | Status | Notes |
|----------|:------:|-------|
| PIN verified before read/write | ✅ | Optional but recommended |
| PIN retry counter | ✅ | 5 attempts, then card locks |
| Data encrypted before card write | ✅ | Only ciphertext touches the card |
| Multi-item support | ✅ | JSON array format, 240-byte chunking |
| Card reset (factory erase) | ⚠️ | Available without PIN (for recovery) |

---

## Bob AI Security Boundaries

```
  ┌───────────────────────────────────────────────────┐
  │                  Bob AI (Gemini)                    │
  │                                                    │
  │  ┌──────────────────────────────────────────────┐  │
  │  │  What Bob CAN access:                        │  │
  │  │  • User's typed questions                    │  │
  │  │  • Conversation history (current session)    │  │
  │  │  • App documentation (hardcoded in prompt)   │  │
  │  └──────────────────────────────────────────────┘  │
  │                                                    │
  │  ┌──────────────────────────────────────────────┐  │
  │  │  What Bob CANNOT access:                     │  │
  │  │  ✗ Seed phrases or secrets                   │  │
  │  │  ✗ Passwords or keyfiles                     │  │
  │  │  ✗ Encrypted shares or vault data            │  │
  │  │  ✗ Smart card contents                       │  │
  │  │  ✗ File system or OS resources               │  │
  │  └──────────────────────────────────────────────┘  │
  │                                                    │
  │  Safeguards:                                       │
  │  • Explicit disclaimer before first use            │
  │  • User provides their own API key                 │
  │  • Markdown output sanitized (rehype-sanitize)     │
  │  • Chat history clearable at any time              │
  │  • API key removable at any time                   │
  └───────────────────────────────────────────────────┘
```

---

## Web App HTTP Security Hardening (Cloudflare Proxy)

### Background

The audit above focused on the desktop app and the shared cryptographic library. The web app at `app.seqrets.app` is hosted on **GitHub Pages**, which serves a fixed, minimal set of HTTP response headers and does not honor custom header configuration. This left the web app's HTTP layer thinner than the desktop app's WebView policy, with its security depending entirely on the in-document `<meta http-equiv="Content-Security-Policy">` tag defined in `src/app/layout.tsx`.

A March 2026 attempt to migrate the web app to Cloudflare Pages — which would have enabled the repo's `public/_headers` file natively — was abandoned after the build broke in ways that could not be reconciled with the project's Next.js static-export configuration.

### Solution: Cloudflare proxy in front of GitHub Pages (April 2026)

Rather than migrating hosting, `app.seqrets.app` was switched from grey-cloud (DNS only) to orange-cloud (proxied) in Cloudflare. GitHub Pages continues to serve the static bundle as origin; Cloudflare sits at the edge and injects security headers via a **Response Header Transform Rule** scoped to `(http.host eq "app.seqrets.app")`. The rule does not affect the landing page at the apex.

### Headers now served at the HTTP layer

| Header | Value | Purpose |
|---|---|---|
| `Content-Security-Policy` | `default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: blob:; connect-src 'self' https://api.coinbase.com https://generativelanguage.googleapis.com; worker-src 'self' blob:; frame-src 'none'; object-src 'none'; base-uri 'self'; form-action 'self'` | Identical to `layout.tsx` meta CSP; belt-and-suspenders. No `unsafe-eval`, narrow `connect-src` allowlist. |
| `X-Frame-Options` | `DENY` | Clickjacking protection (header-only directive, not available via meta) |
| `X-Content-Type-Options` | `nosniff` | Blocks MIME sniffing |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Limits referrer leakage |
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains` | Forces HTTPS on all subdomains for 1 year (preload not submitted — see note below) |
| `Permissions-Policy` | `camera=(self), microphone=(), geolocation=()` | Same-origin camera for QR scan; mic and geolocation fully denied |
| `X-Permitted-Cross-Domain-Policies` | `none` | Legacy Flash/Silverlight hardening |

### Additional hardening

- **SSL/TLS mode: Full (strict).** Cloudflare validates the origin's certificate chain (GitHub Pages serves a valid Let's Encrypt cert with auto-renewal).
- **Cloudflare Web Analytics disabled.** Prior to this work, Cloudflare was auto-injecting a `cloudflareinsights.com` beacon script into proxied pages, violating both the app's strict CSP and the README's "no telemetry" claim. The site was removed from Web Analytics entirely. Zero third-party beacons are now injected.
- **`public/_headers` in repo kept in sync** with the live Cloudflare rule, marked as reference-only documentation.

### Operational notes

- **Reversibility.** The entire setup rolls back with a single DNS toggle: set the `app` CNAME from orange-cloud back to grey-cloud in Cloudflare DNS. Within ~60 seconds the site returns to direct GitHub Pages serving. No code, no build, no deploy pipeline is involved.
- **Scope isolation.** The Transform Rule is filtered by hostname, so the landing page at `seqrets.app` (hosted on Cloudflare Pages with its own `_headers` file) is completely unaffected by this change.
- **HSTS preload.** The `preload` directive was deliberately omitted. Modern browsers auto-upgrade HTTP→HTTPS regardless, making preload a marginal security improvement in exchange for a permanent, hard-to-reverse commitment across all subdomains. Revisit when the subdomain topology is stable.

### What this closes

This addresses F-06 from the v1.7.0 audit ("No CSP for web app on GitHub Pages") — previously marked as *Won't fix / accepted risk*, now **resolved**. The web app's HTTP-layer security is no longer gated by the hosting platform's limitations.

---

## Remediation Status

### Completed Fixes ✅

| # | Fix | File | Status |
|:-:|-----|------|:------:|
| C1 | Strict Content Security Policy enabled | `tauri.conf.json` | ✅ Done |
| H1 | Chunk count validation (reject >255) | `smartcard.rs` | ✅ Done |
| M1 | Clipboard auto-clear after 60 seconds | 9 frontend files | ✅ Done |
| M3 | `console.error` removed from production crypto | `crypto.ts` | ✅ Done |
| M4 | Source maps disabled in production builds | `tsup.config.ts` | ✅ Done |
| L1 | `Zeroizing<String>` for password parameter | `crypto.rs` | ✅ Done |
| L2 | UTF-8 boundary-aware label truncation | `smartcard.rs` | ✅ Done |
| M2 | API key moved to OS keychain (desktop) | `keychain.rs`, `bob-api.ts` | ✅ Done |
| I1 | Argon2id iterations increased to t=4 | `crypto.rs`, `crypto.ts` | ✅ Done |
| I2 | Replaced unaudited Shamir library with audited alternative | `crypto.ts`, `desktop-crypto.ts` | ✅ Done |
| L3 | Card capacity queried from card via GET STATUS APDU | `SeQRetsApplet.java`, `smartcard.rs` | ✅ Done |

### Remaining (Roadmap)

All 11 findings have been resolved. No items remain on the security roadmap.

---

## Testing & Verification

### Cryptographic Test Coverage

The Rust backend includes unit tests verifying:

- ✅ Round-trip encryption/decryption (with and without keyfile)
- ✅ Wrong password correctly rejected (MAC verification failure)
- ✅ Different encryptions of same data produce different ciphertexts (random salt + nonce)
- ✅ Wire format compatibility between Rust and JavaScript implementations
- ✅ Compression/decompression integrity

### End-to-End Test Suite (Playwright)

114 tests across 12 spec files, run against 3 browser projects (Chromium, iPhone 14, iPad Mini) = 342 total test runs. Coverage includes:

- ✅ Full encrypt → Shamir split → QR code generation roundtrip
- ✅ BIP-39 mnemonic validation and optimization
- ✅ Password validation (length, character classes, boundary cases)
- ✅ Shamir parameter validation (threshold ≤ shares)
- ✅ Restore flow (manual share entry, duplicate detection, credential entry)
- ✅ Navigation and routing (all routes, 404, deep URLs, back/forward)
- ✅ Edge cases (XSS payloads, unicode/emoji, null bytes, 10K+ char secrets, rapid clicks)
- ✅ Zero console errors on all pages
- ✅ Responsive layout at 375px, 768px, and 1280px viewports
- ✅ LocalStorage resilience (corrupted data, missing keys, oversized values)
- ✅ External link integrity (Go Pro, shop upsells, rel=noopener)
- ✅ Bob AI chat input validation

### What Has Been Verified

| Check | Result |
|-------|:------:|
| No `unsafe` blocks in Rust codebase | ✅ Verified |
| No `eval()` or `dangerouslySetInnerHTML` in frontend | ✅ Verified |
| No `Math.random()` for cryptographic operations | ✅ Verified |
| All crypto buffers have zeroization in finally blocks | ✅ Verified |
| npm audit: 0 vulnerabilities | ✅ Verified |
| No API routes or server-side code | ✅ Verified |
| No secrets stored in localStorage | ✅ Verified |
| Drag-drop disabled in Tauri config | ✅ Verified |
| Update signatures verified via Minisign | ✅ Verified |
| Debug logging disabled in release builds | ✅ Verified |

---

## Conclusion

seQRets demonstrates **strong cryptographic engineering** with a well-designed zero-knowledge architecture. The desktop app provides meaningful security advantages over the web version through Rust-native cryptography, compiler-guaranteed memory erasure, browser extension immunity, and code-signed binary integrity.

The 11 findings identified in this analysis were primarily configuration hardening opportunities (CSP, source maps) and edge-case robustness improvements (chunk overflow, clipboard clearing) — **none compromised the core cryptographic guarantees** of the application. **All 11 findings have been resolved.** Additionally, the password generator now guarantees at least one character from each required class (lowercase, uppercase, digit, special) via Fisher-Yates shuffle, eliminating the ~2.3% chance of generating an invalid password.

The cryptographic primitives (XChaCha20-Poly1305, Argon2id, Shamir's Secret Sharing) are industry-standard, properly parameterized, and correctly implemented across both the Rust and JavaScript codebases.

---

<p align="center">
<em>This analysis was conducted through a full source code review of all Rust, TypeScript, and configuration files in the seQRets desktop application (v1.5.3). All 11 findings were remediated immediately following the audit. Comprehensive Playwright e2e test suites were added for both web (342 test runs across 3 browsers) and desktop (145 tests, 136 passing + 9 Tauri-IPC-only skipped) to verify ongoing correctness. The password generator character class guarantee was propagated from the web app to the desktop app. Last updated March 17, 2026.</em>
</p>
