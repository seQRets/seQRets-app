<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="public/icons/logo-dark.webp" />
    <source media="(prefers-color-scheme: light)" srcset="public/icons/logo-light.webp" />
    <img src="public/icons/logo-dark.webp" alt="seQRets Logo" width="200" />
  </picture>
</p>

<h1 align="center">seQRets</h1>

**Secure. Split. Share.**

seQRets **encrypts** and splits your most sensitive secrets — seed phrases, private keys, passwords, and other confidential data — into QR codes called **Qards**, using **Shamir's Secret Sharing**. Use it to **protect your own digital assets** with layered, distributed security, or to ensure your **loved ones can inherit them** when the time comes.

Recovering a secret requires combining a configurable threshold of Qards (e.g., 2 of 3) — no single Qard holds enough to restore anything on its own, eliminating the single point of failure that plagues traditional backups. Nothing is stored online: no accounts, no KYC, no data shared with anyone you don't choose. The desktop app includes **EAL6+ JavaCard smartcard support** for tamper-resistant, simple physical distribution of Qards and inheritance plans.

> 🛡️ **Your secrets never leave your device.** All encryption, splitting, and decryption happens entirely in your browser (web) or on your machine (desktop). No servers, no cloud, no accounts, no telemetry. seQRets is <a href="https://github.com/seQRets/seQRets-app" target="_blank" rel="noopener noreferrer">open source</a> — audit every line.

## ⚠️ Warning

> 🚧 **Beta Software — No Independent Security Audit.** seQRets v1.4.5 has not undergone a formal third-party security audit. The cryptographic primitives are industry-standard, but the implementation has not been independently reviewed. **Do not use seQRets as your only backup for high-value secrets.** Always maintain independent backups through other secure means (hardware wallet, paper backup in a fireproof safe, etc.) until a formal audit has been completed.

**Your security is your responsibility.** seQRets gives you full control over your digital assets. Misplacing your password or the required number of Qards can result in the **permanent loss** of your secret. The developers have no access to your data, cannot recover your password, and cannot restore your secrets. Manage your Qards and password with extreme care.

## 📦 Get seQRets

### 🌐 Web App (Free)
Use seQRets directly in your browser — no installation required.

**<a href="https://app.seqrets.app" target="_blank" rel="noopener noreferrer">Launch seQRets Web App →</a>**

### 🖥️ Desktop App

| | Source Available (Unsupported) | Official Signed Release |
|---|---|---|
| **Cost** | Free (unsupported) | TBD |
| **Source** | Compile from this repo | Signed pre-built binary |
| **Platforms** | Any (with Rust + Node.js) | macOS, Windows, Linux |
| **Auto-updates** | ✗ | ✓ |
| **Code signed** | ✗ | ✓ |
| **Smart card** | ✗ | ✓ Included |
| **Portable card reader** | ✗ | ✓ Included |

#### Source Available

The full source is available under AGPLv3 for security review. Build instructions are in [BUILDING.md](BUILDING.md).

#### Official Signed Release

Purchase an official release and receive:
- ✅ Code-signed binary for your platform (macOS, Windows, or Linux)
- ✅ Automatic updates — always stay on the latest version
- ✅ A complementary JavaCard-based smart card for secure key storage
- ✅ A portable USB smart card reader

**<a href="https://seqrets.app" target="_blank" rel="noopener noreferrer">Purchase Official Release →</a>**

> 💡 **Why pay when it's open source?** You're paying for the convenience of signed builds with automatic updates, plus physical hardware (smart card + reader) shipped to your door. The source code is and always will be free.

---

## ✨ Features

### 🔒 Secure Your Secret
- Enter any text-based secret (seed phrases, private keys, passwords, etc.)
- Encrypt with a strong password (24+ characters required)
- Optionally add a **keyfile** as a second factor — both password AND keyfile are required for recovery; generate a keyfile and **download** or **save to Smart Card** (desktop only)
- **Keyfile smart card storage** — write keyfiles to JavaCard for tamper-resistant physical backup; load keyfiles from a smart card anywhere keyfiles are accepted (desktop only)
- Split into configurable Qards (e.g., 2-of-3, 3-of-5 threshold)
- Download Qards as QR code images or export as a `.seqrets` vault file
- **Write to JavaCard smartcard** — store individual shares, full vaults, keyfiles, or encrypted inheritance plans on JCOP3 hardware (desktop only)
- **100% offline-capable** — works without an internet connection. No accounts, no cloud, no telemetry. The only optional network call is the Bob AI assistant (user-provided API key).

### 🔓 Restore Your Secret
- **Drag & drop** QR code images from your file system
- **Upload** Qard image files (PNG, JPG)
- **Scan** QR codes with your camera (desktop and web)
- **Manual text entry** — paste raw share data
- **Import vault file** — load all shares at once from a `.seqrets` file
- **Read from smartcard** — load shares or vaults directly from a JavaCard (desktop only)
- **Data QR display** — after restoration, view your secret as a standard QR code for easy transfer
- **SeedQR display** — for BIP-39 seed phrases, view as a SeedQR (zero-padded 4-digit word indices) compatible with hardware wallets like SeedSigner; supports multi-mnemonic secrets with one SeedQR per phrase
- Success sound plays on each accepted share

### 📜 Inheritance Plan
- **In-app plan builder** (desktop only) — create your inheritance plan directly inside the app using a structured, 8-section form. No need to type sensitive information into external editors. The plan is encrypted natively as a compact JSON blob (~2-4 KB) that fits on a smart card.
- **File upload** — alternatively, encrypt any file (PDF, DOCX, ODT, TXT) with the same XChaCha20-Poly1305 + Argon2id security (available on both web and desktop)
- Three tabs: **Encrypt Plan** (upload a file) | **Create Plan** (in-app builder, desktop only) | **Decrypt Plan**
- Password generator with the same 24-character multi-character-class requirement
- Optional keyfile support — generate a keyfile (with download or save to Smart Card) or upload an existing one (desktop only)
- **Dynamic file naming** — saved plans use the preparer's last name (e.g., `Smith-Inheritance-Plan.json`) for easy identification
- **Save to File** and/or **Write to Smart Card** (desktop only, if encrypted size ≤ 8 KB)
- Decrypt tab auto-detects in-app plans and renders them in a structured read-only viewer; file-based plans trigger a standard file download
- Available on both web and desktop (in-app builder is desktop only)

### 🛠️ Helper Tools
- **Password Generator** — cryptographically secure 32-character passwords (88-character charset)
- **Seed Phrase Generator** — generate valid BIP-39 mnemonic phrases
- **Bitcoin Ticker** — live BTC/USD price display
- **Bob AI Assistant** — Google Gemini-powered AI for setup guidance and questions (optional, user-provided API key). Can be disconnected at any time by removing the API key from within the chat interface.

### 🧬 BIP-39 Optimization
Seed phrases are automatically detected and converted to compact binary entropy before encryption. A 24-word phrase (~150 characters) becomes just 32 bytes, dramatically reducing QR code size.

## ⚙️ How seQRets Works

All operations run **entirely on your device** — nothing is ever sent to a server.

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

## 🏛️ Inheritance Planning Guide

Cryptocurrency has no "forgot password" recovery. If the holder dies without a plan, the assets are permanently lost. seQRets is designed to solve this problem.

### The Split Trust Model

The recommended approach creates **layered security with no single point of failure**:

| Layer | What | How |
|-------|------|-----|
| **1. Split the Secret** | Encrypt and split your seed phrase into Qards | Use the **Secure Secret** tab with a 2-of-3 or 3-of-5 threshold |
| **2. Write the Plan** | Create a clear instruction document for your heirs | Use the **Inheritance Plan** tab to encrypt a PDF/DOCX with recovery steps |
| **3. Distribute** | Give Qards to different trusted people/locations | No single person or location gets everything |

### Example: 2-of-3 Distribution

| Item | Location | Who Has Access |
|------|----------|---------------|
| Qard 1 | Home fireproof safe | Spouse |
| Qard 2 | Trusted family member | Sibling or adult child |
| Qard 3 | Bank safe deposit box | Named on the box |
| Encrypted Plan | With estate attorney | Attorney (sealed) |
| Password | Inside the encrypted plan only | No one — until decrypted |

> **Critical rule:** The password should NEVER be stored alongside the Qards. Include it only inside the encrypted inheritance plan document.

### What to Put in Your Inheritance Plan Document

The desktop app's **Create Plan** tab provides a structured form covering all of these sections. Alternatively, your encrypted instruction document should include:
- **Asset inventory** — list of wallets, exchanges, and holdings (not the secrets themselves)
- **Recovery instructions** — step-by-step guide for using seQRets to restore the secret
- **Qard locations** — where each Qard is physically stored and who holds it
- **Password** — safe to include here because the document is encrypted
- **Keyfile location** — if used, where the keyfile is stored
- **Exchange accounts** — exchange names, registered emails, and instructions to contact them with a death certificate
- **Hardware wallet locations** — physical devices, PINs, and access instructions
- **Professional contacts** — attorney, financial advisor, trusted technical friend

### Common Mistakes

- ❌ Storing seed phrases in a will (wills become public during probate)
- ❌ Telling no one your crypto exists
- ❌ Giving one person all Qards + the password
- ❌ Never testing the recovery process
- ❌ Forgetting to update after acquiring new assets or changing passwords

### Legal Considerations

> ⚠️ **seQRets is not a legal tool.** Consult a qualified estate planning attorney for wills, trusts, powers of attorney, and tax planning. seQRets handles the technical security layer — splitting and encrypting your secrets — but a complete estate plan requires legal documentation.

Key topics to discuss with your attorney:
- **Digital asset clauses** in your will or trust
- **Revocable living trusts** to avoid probate for crypto assets
- **Durable power of attorney** explicitly covering digital assets (for incapacity, not just death)
- **Tax implications** — inherited crypto may receive a stepped-up cost basis

## 🔐 Security Architecture

All cryptographic operations run **entirely on your device**. Your secrets never leave your machine.

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

### 🔗 Encrypt-First Architecture (Security by Design)

seQRets deliberately **encrypts first, then splits** — this ordering is a critical security choice:

```
Secret → Compress (gzip) → Encrypt (XChaCha20-Poly1305) → Split (Shamir's) → Distribute
```

Each Qard contains a fragment of the **encrypted** ciphertext — never raw plaintext. To recover the secret, an attacker must:

1. **Obtain** the required threshold of Qards (e.g., 2-of-3), AND
2. **Know** the password (+ keyfile, if used)

These are **layered defenses** — both must be defeated. The alternative design (split first, then encrypt each share individually) is weaker: each share becomes an independent encryption target, and cracking the password on a single share could reveal partial plaintext. With Encrypt→Split, a stolen Qard is computationally indistinguishable from random noise.

### ⚛️ Quantum Resistance

The built-in password generator produces passwords with ~10^62 possible combinations. Even with Grover's algorithm (optimal quantum speedup), brute-forcing would take:

- **Optimistic estimate:** ~2 × 10^18 years (148 million × the age of the universe)
- **Realistic estimate:** ~2 × 10^23 years (148 trillion × the age of the universe)

Argon2id's memory-hardness provides additional quantum resistance, and XChaCha20-Poly1305 maintains 128-bit effective quantum security as a defense-in-depth layer.

### 🎲 Random Number Generation (CSPRNG)

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

## 🛡️ App Security

seQRets is transparent about its threat model. This section documents the known security properties and limitations of both the web and desktop apps so users can make informed decisions about what to protect and how.

### 🌐 Web App — Threat Model

Both the secret input and password fields are **masked by default** with reveal-toggle controls, which mitigates casual shoulder surfing and incidental screen capture during normal use.

| Threat | Status | Notes |
|--------|--------|-------|
| **Browser extensions** | ⚠️ Unmitigated | The most serious realistic threat. A malicious or compromised extension runs in the same browser context and can read the DOM, intercept keystrokes, and access clipboard data regardless of field masking — extensions operate at higher privilege than the page. |
| **JS string memory** | ⚠️ Partial | Derived keys and byte buffers are zeroed via `fill(0)` in `finally` blocks. JS strings (your password) cannot be zeroed — they persist in the V8 heap until garbage collection, which may never happen within a session. |
| **Screen recording** | ⚠️ Partial | Both secret and password fields are masked by default. The risk surface is the reveal toggle — when the eye icon is clicked, the secret is briefly visible on screen. A keylogger is unaffected by masking. |
| **CDN / supply chain** | ⚠️ Per-load risk | JavaScript is served by GitHub Pages. A CDN-level compromise could serve tampered code before load. Going offline after the page loads mitigates mid-session swaps. |
| **Clipboard** | ⚠️ OS-shared | Pasted content is readable by any focused app and may linger in clipboard history tools. |
| **Constant-time operations** | ⚠️ No guarantee | Browser JS has no constant-time execution guarantee. Timing side channels in comparison operations are theoretically possible, though difficult to exploit remotely. |
| **Spectre / shared memory** | ℹ️ Browser-mitigated | Modern browsers use site isolation, but shared renderer process memory between tabs remains a known attack class. |

### 📴 Running Offline After Load

Disconnecting from the network after the page has loaded provides limited but real protection:

**Genuinely mitigated:**
- CDN tampering for that session — the JS is already parsed and running; a server-side swap cannot affect you mid-session
- Accidental outbound data transmission (seQRets makes none by design, but offline adds a hard network-level guarantee)
- DNS-based redirects or injection after load

**Not mitigated:**
- Browser extensions — already running and network-independent; a malicious extension can store your secret locally and transmit it when you reconnect
- JS heap / string memory — offline changes nothing about V8 garbage collection
- Clipboard and screen recording — OS-level, not network-dependent
- Any malicious JS that was already loaded — it can queue exfiltration and fire it when connectivity is restored

### 🖥️ Desktop vs Web — Security Comparison

| Threat | Web | Desktop |
|--------|-----|---------|
| **Browser extension attack surface** | ✗ Unmitigated | ✓ Tauri WebView runs without browser extensions |
| **JS string memory** | ✗ Password persists in V8 heap | ⚠️ Password transits JS heap via IPC, but derived key stays entirely in Rust |
| **Key zeroization** | ⚠️ `fill(0)` — optimizer may elide | ✓ Rust `zeroize` crate — compiler-fence guaranteed |
| **CDN / supply chain** | ✗ Per-load risk | ✓ Official release is code-signed with integrity verified at install |
| **Constant-time operations** | ✗ No guarantee | ✓ Rust crypto crates are constant-time by design |
| **Clipboard** | ✗ OS-shared | ✗ Same |
| **Screen recording** | ⚠️ Partial (masked by default) | ⚠️ Same |

The two most impactful threats — browser extensions and JS memory — are both substantially closed by the desktop app. The remaining risks (clipboard, screen recording) are OS-level and cannot be fully solved by any software.

> ⚠️ **Self-built binaries are not code-signed.** The CDN/supply-chain protections in the table above apply only to the official signed release. If you compile from source, you are responsible for verifying the integrity of your own build. Self-built binaries will trigger OS gatekeeper warnings and do not receive automatic updates.

> **Bottom line:** The web app is appropriate for users who understand the threat model, use a clean browser profile with no untrusted extensions, and are comfortable with client-side-only JavaScript cryptography. For maximum security — especially for high-value seed phrases — use the desktop app.

## 💳 JavaCard Smartcard Support

The desktop app supports storing Shamir shares, encrypted vaults, and encrypted inheritance plans on **JCOP3 JavaCard smartcards** (e.g., J3H145), providing tamper-resistant physical backups that survive fire, water, and digital threats.

### Hardware Requirements
- **Card:** JCOP3 J3H145 or compatible JavaCard 3.0.4+ smartcard (~110 KB usable EEPROM)
- **Reader:** Any PC/SC-compatible USB smart card reader

### Features
- **Write individual shares**, **full vaults**, **keyfiles**, or **encrypted inheritance plans** to a card via APDU over PC/SC
- **Read back** shares, vaults, or keyfiles directly from a card into the restore workflow
- **Multi-item storage** — store multiple items (shares, vaults, keyfiles, instructions) on a single card up to ~8 KB; new writes append to existing data
- **Per-item management** — view, select, and delete individual items from the Smart Card Manager page
- **Optional PIN protection** (8-16 characters) — card locks after 5 wrong attempts
- **PIN retry countdown** — real-time display of remaining PIN attempts (color-coded: gray → amber → red) across both the Smart Card Manager page and the smart card dialog
- **Generate PIN** — CSPRNG-powered 16-character PIN generator (upper/lowercase, numbers, symbols) with copy-to-clipboard and reveal/hide toggle
- **Data chunking** — automatically handles payloads larger than the 240-byte APDU limit
- **Clone card** — read all items from one card and write them to another card via the Smart Card Manager page; supports both single-reader (swap card) and dual-reader workflows with an optional destination PIN
- **Erase** confirmation to prevent accidental data loss

### Applet Installation

The seQRets applet must be installed on each card before use. See [BUILDING.md](BUILDING.md#-javacard-applet-installation) for build and installation instructions.

### Applet AID
`F0 53 51 52 54 53 01 00 00` — selected automatically by the desktop app.

## 🛠️ For Developers

Source is available for security audit and self-compilation under AGPLv3. See [BUILDING.md](BUILDING.md) for prerequisites, build instructions, project structure, and available scripts.

## 🤝 Contributing

We rely on GitHub for bug tracking. Before reporting a new bug, please take a moment to search the [existing issues](https://github.com/seQRets/seQRets-app/issues) to see if your problem has already been addressed. If you can't find an existing report, feel free to create a new issue.

We encourage contributions to the project by submitting pull requests to improve the codebase or introduce new features. All pull requests will be thoroughly reviewed. Your contributions are invaluable to us! Please read our [Contributing Guide](CONTRIBUTING.md) before submitting a pull request.

By contributing, you agree to our [Contributor License Agreement (CLA)](CONTRIBUTING.md#contributor-license-agreement-cla).

## 📄 License

This project is licensed under the **GNU Affero General Public License v3.0 (AGPLv3)** — see the [LICENSE](LICENSE) file for details.

### Commercial Licensing

We also offer commercial licenses for companies wanting to use seQRets in proprietary products or avoid copyleft — email **licensing@seqrets.app**.

Copyright (c) 2026 seQRets — All rights reserved where applicable.

## ⚠️ Disclaimer

For the highest level of security, consider using seQRets on a computer specifically provisioned for secret management with no unnecessary network connectivity. While seQRets is designed to work safely in everyday environments, air-gapped operation eliminates network-based attack vectors entirely.

The developers, contributors, and maintainers of seQRets cannot be held liable for lost or stolen secrets. **USE AT YOUR OWN RISK.**

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS, COPYRIGHT HOLDERS OR CONTRIBUTORS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
