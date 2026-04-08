# Threat Model

seQRets is transparent about its threat model. This document describes the known security properties and limitations of both the web and desktop apps so users can make informed decisions about what to protect and how.

## Web App

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

### Running Offline After Load

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

## Quantum Attacks

The seQRets scheme is quantum-resistant under its own assumptions. The scheme's response to quantum attacks depends entirely on whether the share threshold has been breached.

| Threat | Status | Notes |
|---|---|---|
| **Quantum attack, scheme intact (< K shares compromised)** | ✓ Fully mitigated | Shamir's Secret Sharing is information-theoretically secure. With fewer than K shares, an adversary has literally zero bits of information about the secret — not "hard to compute", but mathematically absent. No quantum (or classical) algorithm can attack what does not exist. Grover's doesn't apply. Shor's doesn't apply. The ciphertext is never reconstructed, so XChaCha20-Poly1305 is never attacked at all in this regime. |
| **Quantum attack, scheme failed (≥ K shares compromised)** | ⚠️ Defense-in-depth | This scenario is a failure of share distribution, not of the cryptography, and lies outside the primary threat model. Even so, the cipher layer still provides post-quantum margin: XChaCha20-Poly1305's 256-bit key gives ~128-bit effective post-quantum security under Grover's algorithm, Argon2id (64 MB, 4 iterations) raises the brute-force cost, and the generator's 24+ character passwords (~10^62 combinations) put Grover-accelerated brute-force beyond any realistic attacker. |

### Honest framing

seQRets is not "fully post-quantum secure in all scenarios" — no honest scheme is. The correct framing:

- **Under the primary threat model** (share distribution working as designed), the scheme is quantum-resistant by an information-theoretic argument that is independent of any computational assumption.
- **Under scheme-failure conditions** (threshold compromised), XChaCha20-Poly1305 + Argon2id provide ~128-bit post-quantum defense-in-depth.

For the cryptographic derivation of why this holds, see [ARCHITECTURE.md](ARCHITECTURE.md#quantum-resistance).

## Threats Mitigated by the Optional Keyfile

A keyfile is a 32-byte random value that is concatenated with the password before key derivation (see [ARCHITECTURE.md](ARCHITECTURE.md#optional-keyfile-second-factor) for the cryptographic details). Both the password AND the keyfile are required — one without the other is useless. This section describes the attack vectors a keyfile meaningfully changes.

### Password compromise becomes insufficient

Most realistic password-compromise vectors yield only the password, not the keyfile:

| Threat | Password only | Password + keyfile |
|---|---|---|
| **Keylogger** captures password as typed | ✗ Secret compromised | ✓ Attacker still needs the keyfile |
| **Shoulder-surf** of password entry | ✗ Secret compromised | ✓ Keyfile is binary, not typed |
| **Phishing** tricks user into revealing password | ✗ Secret compromised | ✓ Keyfile is a file, not a memorable string |
| **Password reuse breach** (another site leaks the same password) | ✗ Secret compromised | ✓ Leaked password is useless without the keyfile |
| **Acoustic / EM keystroke analysis** | ✗ Secret compromised | ✓ Keyfile isn't typed |
| **Brute-force / dictionary attack** against weak password | ✗ Eventually compromised | ✓ Adding 256 bits of unknown entropy makes brute-force infeasible regardless of password strength |
| **RAM/V8 heap forensics after a session** (web limitation) | ⚠️ Password may be recoverable from heap | ⚠️ Both would need to be recoverable; keyfile has no JS-string lifetime problem because it's loaded as bytes, not a string |

### Coercion and duress ("$5 wrench attack")

This is the most distinctive thing a keyfile buys you, and it only works if you **deliberately do not co-locate the keyfile with yourself**.

| Scenario | Password only | Password + keyfile (stored elsewhere) |
|---|---|---|
| **Physical coercion to decrypt on the spot** | ✗ You know the password — "I won't" is your only defense | ✓ You genuinely *cannot* decrypt; "I can't" is a factually true answer |
| **Border crossing — agent demands decryption** | ✗ You have to comply or refuse | ✓ Keyfile in a safe deposit box / other jurisdiction means compliance is physically impossible |
| **Traveling with crypto wealth** | ✗ Full access lives in your head | ✓ Leave the keyfile at home; you carry only half the factor |
| **Legal compulsion to produce a password** | ⚠️ Jurisdiction-dependent, but the password exists in your mind | ✓ You cannot be compelled to produce a file you don't physically possess |

The mechanism is simple: *"I cannot unlock this without a file I don't have on me"* is a verifiable statement, unlike *"I refuse to unlock this."* The former is factual, the latter is a choice the adversary can try to change.

### Not mitigated by a keyfile

A keyfile is not a magic bullet. These threats are unchanged or only marginally improved:

- **Both factors compromised simultaneously** — malware that reads files from disk AND logs keystrokes captures both
- **You are carrying the keyfile when attacked** — if the keyfile is on your laptop, phone, or USB stick on your person, the coercion defense evaporates
- **Physical access to the storage location** holding both factors — e.g., keyfile and password-containing notebook in the same drawer
- **Threshold reached on the Qard side** — if an attacker already has enough Qards AND both factors, the keyfile adds nothing
- **Loss of the keyfile** — there is no recovery path. Losing the keyfile is equivalent to losing the secret itself. This is the tradeoff for the coercion defense.

### Practical distribution patterns

Good keyfile storage patterns map to the threat you care about most:

- **Coercion defense** → keyfile in a bank safe deposit box, a trusted third party in another jurisdiction, or a smart card stored physically separate from the user
- **Password-compromise defense** → keyfile on a smart card or hardware token kept on the user's person, password memorized or in a password manager
- **Inheritance use case** → keyfile distributed as one of the Qards' physical artifacts (e.g., smart card at the attorney's office alongside the sealed instructions)

## Desktop vs Web Comparison

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
