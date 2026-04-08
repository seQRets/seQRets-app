# Security Policy

## Supported Versions

| Version | Supported |
|---------|-----------|
| 1.4.x   | Yes       |
| < 1.4   | No        |

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

## Security Design

For details on the cryptographic architecture, threat model, and security trade-offs, see [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) and [docs/THREAT_MODEL.md](docs/THREAT_MODEL.md).
