# Contributing to seQRets

Thank you for your interest in contributing to seQRets! We welcome contributions from the community and are grateful for every pull request, bug report, and feature suggestion.

## Getting Started

1. **Fork** the repository on GitHub
2. **Clone** your fork locally:
   ```bash
   git clone https://github.com/YOUR_USERNAME/seQRets.git
   cd seQRets
   npm install
   ```
3. **Create a branch** for your changes:
   ```bash
   git checkout -b feature/your-feature-name
   ```
4. **Make your changes**, write tests if applicable, and ensure everything builds:
   ```bash
   npm run build
   npm run type-check
   npm run lint
   ```
5. **Commit** and **push** your changes, then open a **Pull Request** against the `main` branch.

## Development

### Web App
```bash
npm run dev           # Start dev server on port 9002
```

### Desktop App (Tauri)
```bash
npm run desktop:dev   # Run desktop app in dev mode
```

### Shared Crypto Library
```bash
npm run build:crypto  # Build the @seqrets/crypto package
```

## Code Guidelines

- **TypeScript** is required for all frontend code
- **Rust** is used for the Tauri backend (smartcard communication)
- Follow existing code patterns and naming conventions
- Keep security-critical code clean, well-documented, and auditable
- Never use `Math.random()` for any security operation — always use the Web Crypto API CSPRNG
- All cryptographic operations must remain client-side (zero-knowledge architecture)

## Reporting Bugs

Please open an issue on GitHub with:
- A clear, descriptive title
- Steps to reproduce the bug
- Expected behavior vs. actual behavior
- Your platform (OS, browser, web/desktop)
- Screenshots if applicable

## Suggesting Features

Open an issue with the **feature request** label. Describe the feature, why it's useful, and how it might be implemented.

---

## Contributor License Agreement (CLA)

By submitting a pull request or otherwise contributing to seQRets, you agree to the following Contributor License Agreement:

### 1. Grant of Rights

You grant to the seQRets project maintainers (the "Maintainers") a perpetual, worldwide, non-exclusive, royalty-free, irrevocable license to use, reproduce, modify, sublicense, and distribute your contributions as part of the seQRets project under any license, including proprietary licenses.

### 2. Original Work

You represent that your contribution is your original work and that you have the right to grant this license. If your employer has rights to intellectual property that you create, you represent that you have received permission to make contributions on behalf of that employer, or that your employer has waived such rights.

### 3. No Warranty

You provide your contributions on an "AS IS" basis, without warranties or conditions of any kind, either express or implied.

### 4. Why a CLA?

seQRets is open source under the **GNU Affero General Public License v3.0 (AGPLv3)**. The CLA allows the Maintainers to offer **commercial licenses** to organizations that need to use seQRets in proprietary products or wish to avoid copyleft obligations. This dual-licensing model helps fund continued development of the open-source project while ensuring the community edition remains freely available under AGPLv3.

### 5. Your Rights

The CLA does **not** transfer ownership of your contributions — you retain full copyright. You are free to use your own contributions in any way you choose, including in other projects.

---

## Commercial Licensing

We offer commercial licenses for companies and organizations that want to use seQRets in proprietary products or services without the AGPLv3 copyleft requirements. For commercial licensing inquiries, please contact: **licensing@seqrets.app**

---

## Code of Conduct

Be respectful, constructive, and professional. We're all here to build something that helps people protect their digital assets.

## License

By contributing to seQRets, you agree that your contributions will be licensed under the [GNU Affero General Public License v3.0](LICENSE).
