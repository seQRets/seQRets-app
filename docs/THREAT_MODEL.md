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
