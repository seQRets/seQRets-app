# CLAUDE.md — seQRets App

## Project

**seQRets** is a zero-knowledge crypto inheritance app. Users encrypt secrets client-side (XChaCha20-Poly1305 + Argon2id), split via Shamir SSS into QR "Qards," and distribute to heirs.

- **Monorepo** (npm workspaces): `src/` (Next.js 16 web), `packages/desktop/` (Tauri 2.10), `packages/crypto/` (shared lib), `packages/javacard/` (smart card applet)
- **License**: AGPL-3.0-or-later
- **No test runner** — `npm test` is a no-op

## Dev Commands

```bash
npm run dev                  # Web dev (port 9002)
npm run desktop:dev          # Tauri + Vite desktop
npm run build:crypto         # Build @seqrets/crypto (prerequisite for other builds)
npm run build                # Web production build
npx tsc --noEmit             # Web type check
npx tsc --noEmit -p packages/desktop/tsconfig.json  # Desktop type check
```

## Critical Sync Rules

These files must stay in sync when modified:

1. **Bob AI system prompt** — `src/ai/flows/ask-bob-flow.ts` ↔ `packages/desktop/src/lib/bob-api.ts`
2. **Welcome cards** — `src/app/components/welcome-cards.tsx` ↔ `packages/desktop/src/components/welcome-cards.tsx`
   - Web has desktop app upsell; desktop says "Native Rust crypto" + smart card features
   - localStorage key: `seQRets_skipWelcome`
3. **Version bumps** — run `npm run bump -- <x.y.z> [codename]`. The script edits 5 mechanical files (root/workspace package.json × 3, Cargo.toml, tauri.conf.json) and regenerates lockfiles. UI footers, service worker, and Bob prompts read the version from `scripts/generate-version.mjs` output at build time — don't hand-edit. The bump script prints a stale-doc review checklist after running; eyeball those before tagging a release.

## Key Architecture Differences: Web vs Desktop

| Aspect | Web (Next.js) | Desktop (Tauri + Vite) |
|---|---|---|
| Router | App Router | react-router-dom |
| API key | `localStorage` (sync) | OS keychain via Tauri IPC (async) |
| Images | `next/image` | `<img>` |
| Links | `next/link` (`href`) | react-router-dom (`to`) |
| Crypto | Web Worker | Rust native |
| Smart card | N/A | PC/SC via Rust |

## Conventions

- **UI**: shadcn/ui + Radix + Tailwind 3.4 + Lucide icons
- **Theme**: `next-themes` (web), custom `ThemeProvider` (desktop)
- **Desktop colors**: Use HSL values (`hsl(37,10%,89%)`, `hsl(340,4%,20%)`) — not Tailwind `stone-*`
- **PNG export**: Pure Canvas 2D (`renderCardToCanvas`), NOT html2canvas
- **Tauri config**: Changes to `tauri.conf.json` require full restart (no HMR)
- **Vite env vars**: `VITE_*` baked at startup — restart dev server after changes

## Common Gotchas

- `getApiKey()` is async on desktop (keychain IPC) — handle `null` pending state
- `h-full` doesn't work in flex parents — use `flex-1 min-h-0`
- React StrictMode on desktop causes double-mount in dev
- PWA service worker can serve stale code — clear caches if route changes don't take effect
