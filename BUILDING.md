# Building seQRets from Source

This guide covers everything you need to build and run seQRets locally from source. The full codebase is available under AGPLv3 for security audit and self-compilation.

## 📋 Prerequisites

- **Node.js 20+** — [nodejs.org](https://nodejs.org/)
- **Rust** (desktop app only) — [rustup.rs](https://rustup.rs/)
- **C++ build tools** (desktop app only, platform-specific):
  - **macOS** — `xcode-select --install`
  - **Windows** — [Microsoft C++ Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/) (free; select "Desktop development with C++" workload). WebView2 is already included in Windows 10/11.
  - **Linux** — `sudo apt install build-essential libwebkit2gtk-4.1-dev libssl-dev` (Debian/Ubuntu)

## ⚙️ Setup

```bash
git clone https://github.com/seQRets/seQRets-app.git
cd seQRets-app
npm install
```

## 🌐 Run the Web App

```bash
npm run dev
```

Opens at [http://localhost:9002](http://localhost:9002). All core features work offline — no API keys needed.

## 🖥️ Run the Desktop App

```bash
source ~/.cargo/env    # if Rust was just installed
npm run desktop:dev
```

## 📦 Build the Desktop Installer

```bash
npm run desktop:build
```

Produces `seQRets_1.7.2_aarch64.dmg` in `packages/desktop/src-tauri/target/release/bundle/dmg/`.

## 🤖 Optional: Bob AI Assistant

Bob is an AI assistant that can answer questions about seQRets and inheritance planning. It's entirely optional and disabled by default.

> ⚠️ **Privacy notice:** Bob sends your chat messages to Google's Gemini API. Never enter seed phrases, passwords, private keys, or any sensitive data in the Bob chat. Bob is for app support and inheritance planning guidance only.

- **Web & Desktop:** Click "Ask Bob" → follow the in-app setup guide to enter your free Gemini API key from [Google AI Studio](https://aistudio.google.com/api-keys). Your key is stored in your browser's local storage and never sent anywhere except Google's Gemini API.
- **Remove API key:** Click "Remove API Key" at the bottom of the Bob chat to disconnect the assistant and delete the stored key. You can re-add a key at any time.

## 💳 JavaCard Applet Installation

The SeQRets JavaCard applet must be installed on each card before use. All build tools (`ant-javacard.jar`, `gp.jar`, and the JavaCard 3.0.4 SDK) are included in the repository — no additional downloads are needed.

**Requirements:** JDK 11–17 and Apache Ant.

```bash
cd packages/javacard

# Install JDK and Ant (macOS — skip if already installed)
brew install openjdk@11 ant

# Build the applet
export JAVA_HOME=/opt/homebrew/opt/openjdk@11/libexec/openjdk.jdk/Contents/Home
export PATH="$JAVA_HOME/bin:$PATH"
ant clean build

# Install on card (card must be inserted in a PC/SC reader)
java -jar lib/gp.jar --install build/SeQRetsApplet.cap

# Verify installation
java -jar lib/gp.jar --list
```

> **Note:** Any JDK from version 11 through 17 will work. JDK 18+ is not supported by the JavaCard build toolchain. On macOS with Homebrew, you can also use `openjdk@17`.

## 📁 Project Structure

seQRets is a monorepo with npm workspaces:

```
seQRets/
├── src/                     # Web app (Next.js 16 + React 19)
│   └── app/
│       ├── page.tsx         #   Home (Secure Secret / Restore Secret)
│       └── instructions/    #   Inheritance Plan (Encrypt / Decrypt)
├── packages/
│   ├── crypto/              # @seqrets/crypto — shared JS crypto library
│   │   └── src/             #   XChaCha20, Argon2id, Shamir's, BIP-39 (full impl. for web; BIP-39 helpers for desktop)
│   ├── desktop/             # @seqrets/desktop — Tauri v2 desktop app
│   │   ├── src/             #   React + Vite frontend (pages + components)
│   │   └── src-tauri/       #   Rust backend (crypto engine, PC/SC smartcard, macOS config)
│   └── javacard/            # JavaCard applet for smartcard storage
│       ├── src/             #   SeQRetsApplet.java (APDU command handler)
│       └── build.xml        #   Ant build file (produces .cap)
├── package.json             # Root workspace config
└── README.md
```

## 🧰 Tech Stack

| Component | Technology |
|-----------|------------|
| **Web App** | Next.js 16, React 19, TypeScript, Tailwind CSS, Radix UI |
| **Desktop App** | Tauri v2, Vite, React 19, TypeScript, Tailwind CSS, Radix UI |
| **Desktop Crypto (Rust)** | argon2, chacha20poly1305, zeroize, flate2, rand |
| **Crypto Library (JS)** | @noble/ciphers, @noble/hashes, @scure/bip39, shamir-secret-sharing, pako |
| **AI Assistant** | Google Gemini (via @google/generative-ai) |
| **QR Codes** | qrcode (generate), jsQR (decode) |
| **Smartcard** | JavaCard 3.0.4 applet, Rust pcsc crate, GlobalPlatformPro |

## 📜 Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start web app dev server (port 9002) |
| `npm run build` | Build web app for production |
| `npm run build:crypto` | Build the shared crypto package |
| `npm run desktop:dev` | Run Tauri desktop app in dev mode |
| `npm run desktop:build` | Build desktop .dmg installer |
| `npm run type-check` | TypeScript type checking |
