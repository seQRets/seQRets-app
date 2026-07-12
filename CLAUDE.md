# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

**seQRets** is a zero-knowledge crypto inheritance app. Users encrypt secrets client-side (XChaCha20-Poly1305 + Argon2id), split via Shamir SSS into QR "Qards," and distribute to heirs.

- **Monorepo** (npm workspaces): `src/` (Next.js 16 web), `packages/desktop/` (Tauri 2.10), `packages/crypto/` (shared lib), `packages/shared-ui/` (shadcn primitives consumed by both web + desktop via `@/components/ui/*` path alias), `packages/javacard/` (smart card applet)
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

## Shared Code (edit once — no hand-sync)

After the Batch G refactor, logic that used to be copy-pasted between web and desktop lives in one place. **Edit the shared source, not per-app copies:**

- **`packages/shared-ui/src/`** — consumed by both apps via the `@/components/ui/*` alias. Besides the shadcn primitives it now holds: `camera-scanner`, `password-generator`, `seed-phrase-generator`, `bitcoin-ticker` (logo passed as a prop), `drag-drop-zone`, plus `qard-render.ts` (Qard canvas/ZIP/vault core), `scroll-utils.ts`, `utils.ts`, `clipboard-utils.ts`, `use-mobile`, `use-toast`. (Both Tailwind configs must include `packages/shared-ui/src/**` in content paths.)
- **`@seqrets/crypto`** (`packages/crypto/src/`) — all crypto plus `restore.ts` (`parseShareMeta`, `toSeedQR`, `toCompactEntropy`, `summarizeShareSets`) and re-exported `gzip` / bip39 helpers. Desktop imports these instead of `pako`/`@scure/bip39` directly. Run `npm run build:crypto` after editing.

## Critical Sync Rules

These files still have **no shared core** and must be hand-synced when modified:

1. **Bob AI system prompt** — `src/ai/flows/ask-bob-flow.ts` ↔ `packages/desktop/src/lib/bob-api.ts`. The knowledge base is byte-identical; the only intentional forks are web's desktop-upsell framing (smart cards / in-app plan builder pitched as "desktop-only, coming soon") and the API-key storage plumbing (web session-memory vs desktop keychain). Keep everything else identical.
2. **Welcome cards** — `src/app/components/welcome-cards.tsx` ↔ `packages/desktop/src/components/welcome-cards.tsx`
   - Web has desktop app upsell; desktop says "Native Rust crypto" + smart card features
   - localStorage key: `seQRets_skipWelcome`
3. **Version bumps** — run `npm run bump -- <x.y.z> [codename]`. The script edits 5 mechanical files (root/workspace package.json × 3, Cargo.toml, tauri.conf.json) and regenerates lockfiles. UI footers, service worker, and Bob prompts read the version from `scripts/generate-version.mjs` output at build time — don't hand-edit. The bump script prints a stale-doc review checklist after running; eyeball those before tagging a release.

**Interim-guard twin list** (still duplicated, no shared core yet — keep behavior aligned when touching either side): `create-shares-form`, `restore-secret-form` (shares `@seqrets/crypto` restore logic but keeps platform halves), `qr-code-display` (shares `qard-render` core), `header`, `app-nav-tabs`, `app-footer`, `bob-chat-interface`, `bob-setup-guide` (web "remember" checkbox vs desktop keychain — intentional), `connection-status`, `keyfile-generator`, `terms-gate`, `theme-provider`, and the `file-upload` / `keyfile-upload` / `instructions-file-upload` wrappers (drag logic shared via `drag-drop-zone`, upload handlers still twinned). Intentional divergences here must NOT be "unified": web's browser-safety tip in `create-shares-form`, the L2 print-font split in `qr-code-display`, and never migrating smartcard code to web.

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

## Share Format

Qards serialize as `seQRets|<salt>|<nonce+ciphertext>[|t=K|n=N|i=I]|sha256:<64hex>`.
- Segments 1-3 (`seQRets`, `salt`, `data`) are always present.
- Optional metadata (`t=`, `n=`, `i=`) appears only when `CreateSharesRequest.embedRecoveryInfo` is true. K is the threshold, N is the total, I is the 1-based card index.
- The trailing `sha256:` segment is also optional for backward compat — pre-v1.9 Qards omit it.
- The hash always sits at the **end** of the string. Hash input = everything before `|sha256:`, so manual verification is just `echo -n "<everything before |sha256:>" | shasum -a 256`.
- **Backward compat:** Some v1.11.0 test Qards placed `sha256:` between data and metadata (`...|sha256:H|t=|n=|i=`). `parseShare` accepts either layout — the hash segment is located by content, not position — so older test Qards still verify.
- **Validation:** `parseShare` rejects input > 256 KB (`MAX_SHARE_LENGTH` — never lower it; text-file backup shares can legitimately exceed QR size). t/n/i metadata values must be integers 1..255 with t≤n and i≤n; a partial or contradictory trio is nulled (restore still works, only the countdown UI is lost). Creation caps the compressed payload at 150 KB so generated shares always stay below the parse ceiling.

Helpers in [packages/crypto/src/crypto.ts](packages/crypto/src/crypto.ts): `computeShareHash`, `appendShareHash`, `parseShare`, `truncateHash`. Hash is validated at generation and on restore; tampered Qards are rejected before decryption. Desktop surfaces a green shield indicator and prints a truncated fingerprint on physical cards for visual spot-checking (premium-only UI). When recovery metadata is present, both web and desktop restore forms show a per-set countdown ("X of K added — Y more required"). Card visuals do **not** print K/N — by design, that info lives in the QR data only.

## Common Gotchas

- `getApiKey()` is async on desktop (keychain IPC) — handle `null` pending state
- `h-full` doesn't work in flex parents — use `flex-1 min-h-0`
- React StrictMode on desktop causes double-mount in dev
- PWA service worker can serve stale code — clear caches if route changes don't take effect
