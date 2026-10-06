# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

**seQRets** is a zero-knowledge crypto inheritance app. Users encrypt secrets client-side (XChaCha20-Poly1305 + Argon2id), split via Shamir SSS into QR "Qards," and distribute to heirs.

- **Desktop-only.** The app is `packages/desktop/` (Tauri 2 + Vite + React). The Next.js web app at app.seqrets.app was retired on 2026-10-06; that domain now serves the static holding page in `holding/`. Don't reintroduce web-app code.
- **Monorepo** (npm workspaces): `packages/desktop/` (the app), `packages/crypto/` (`@seqrets/crypto`), `packages/shared-ui/` (shadcn primitives + shared components, resolved via the `@/components/ui/*` path alias — not a workspace; its dependencies are declared in `packages/desktop/package.json` and must stay hoisted to the root `node_modules`), `packages/javacard/` (smart card applet), `holding/` (static holding page for app.seqrets.app)
- **License**: AGPL-3.0-or-later
- **Tests**: `npm test` (crypto core, ~30s) · `npm run test:all` adds the Rust suite

## Dev Commands

```bash
npm run desktop:dev          # Tauri + Vite desktop
npm run desktop:build        # Full Tauri production build
npm run build:crypto         # Build @seqrets/crypto (prerequisite for other builds)
npm run build --workspace=@seqrets/desktop          # Desktop tsc + Vite production build (fast check)
npx tsc --noEmit -p packages/desktop/tsconfig.json  # Desktop type check
npm test                     # Crypto core suite (TS, ~30s) — builds @seqrets/crypto first
npm run test:rust            # Rust crypto suite incl. TS↔Rust parity vectors
npm run test:all             # Both
```

Tests live in `tests/*.test.mjs` and run against the BUILT `@seqrets/crypto` (dist), so what is
tested is what ships. Node's built-in runner — no framework, no new dependencies. CI:
`tests.yml` runs the TS and Rust suites on every push to main and every pull request;
`deploy.yml` redeploys `holding/` to Cloudflare Pages only when that folder changes.

## Shared Code

Edit the shared source, not a copy:

- **`packages/shared-ui/src/`** — the shadcn primitives plus `camera-scanner`, `password-generator`, `seed-phrase-generator`, `bitcoin-ticker` (logo passed as a prop), `drag-drop-zone`, `qard-render.ts` (Qard canvas/ZIP/vault core), `scroll-utils.ts`, `utils.ts`, `clipboard-utils.ts`, `use-mobile`, `use-toast`. (`packages/desktop/tailwind.config.ts` must include `packages/shared-ui/src/**` in its content paths.)
- **`@seqrets/crypto`** (`packages/crypto/src/`) — all crypto plus `restore.ts` (`parseShareMeta`, `toSeedQR`, `toCompactEntropy`, `summarizeShareSets`) and re-exported `gzip` / bip39 helpers. Desktop imports these instead of `pako`/`@scure/bip39` directly. Run `npm run build:crypto` after editing.

## Version Bumps

Run `npm run bump -- <x.y.z> [codename]`. The script edits 5 mechanical files (root/workspace package.json × 3, Cargo.toml, tauri.conf.json) and regenerates lockfiles. UI footers and Bob's prompt read the version from `scripts/generate-version.mjs` output at build time — don't hand-edit. The bump script prints a stale-doc review checklist after running; eyeball those before tagging a release.

## Conventions

- **UI**: shadcn/ui + Radix + Tailwind 3.4 + Lucide icons
- **Theme**: custom `ThemeProvider`
- **Colors**: Use HSL values (`hsl(37,10%,89%)`, `hsl(340,4%,20%)`) — not Tailwind `stone-*`
- **PNG export**: Pure Canvas 2D (`renderCardToCanvas`), NOT html2canvas
- **Tauri config**: Changes to `tauri.conf.json` require full restart (no HMR)
- **Vite env vars**: `VITE_*` baked at startup — restart dev server after changes

## Share Format

Qards serialize as `seQRets|<salt>|<nonce+ciphertext>|v=1[|t=K|n=N|i=I]|sha256:<64hex>` (v1.14+).
- Segments 1-3 (`seQRets`, `salt`, `data`) are always present.
- **`v=` format version (v1.14+):** always the FIRST metadata segment on new shares, hash-covered. Absent = legacy share, parse under old rules. `v` above `SHARE_FORMAT_VERSION` must throw the clear "created by a newer version — update" error, never misparse — that disambiguation is the segment's whole purpose (frozen artifacts: steel plates). Old parsers ignore unknown `key=value` segments and still hash them correctly, so `v=1` shares restore in pre-v1.14 software.
- **Length-privacy padding (v=1 payloads):** the compressed payload is zero-padded to `PAYLOAD_PAD_BUCKET` (192-byte) multiples before encryption — implemented in BOTH `crypto.ts` (`padPayload`) and Rust `crypto.rs` (`pad_payload`, shares only via the `pad` flag; vault/plan blobs stay unpadded). Padding bytes MUST stay 0x00: pako tolerates only trailing zeros after a gzip stream, which is what keeps padded Qards restorable by old apps and deployed recover.html copies. No unpad step exists on restore — decompression self-terminates.
- Optional metadata (`t=`, `n=`, `i=`) appears only when `CreateSharesRequest.embedRecoveryInfo` is true. K is the threshold, N is the total, I is the 1-based card index.
- The trailing `sha256:` segment is also optional for backward compat — pre-v1.9 Qards omit it.
- The hash always sits at the **end** of the string. Hash input = everything before `|sha256:`, so manual verification is just `echo -n "<everything before |sha256:>" | shasum -a 256`.
- **Backward compat:** Some v1.11.0 test Qards placed `sha256:` between data and metadata (`...|sha256:H|t=|n=|i=`). `parseShare` accepts either layout — the hash segment is located by content, not position — so older test Qards still verify.
- **Validation:** `parseShare` rejects input > 256 KB (`MAX_SHARE_LENGTH` — never lower it; text-file backup shares can legitimately exceed QR size). t/n/i metadata values must be integers 1..255 with t≤n and i≤n; a partial or contradictory trio is nulled (restore still works, only the countdown UI is lost). Creation caps the compressed payload at 150 KB so generated shares always stay below the parse ceiling.
- **Share assembly lives in TWO places** that must stay in lockstep: `packages/desktop/src/lib/desktop-crypto.ts` (what the app runs — Rust pads/encrypts, TS assembles the string) and `crypto.ts` `createShares` (the TypeScript reference path — `npm test` and `npm run fixtures:recover` mint Qards with it). The TS↔Rust parity tests in `crypto.rs` tie the two together.
- **Label exposure:** the label is encrypted inside the payload AND (by default) printed on the card face / used in file names. The `showLabelOnExports` prop on `qr-code-display` gates every plaintext surface ("blind export"); the switch lives in the create form.

Helpers in [packages/crypto/src/crypto.ts](packages/crypto/src/crypto.ts): `computeShareHash`, `appendShareHash`, `parseShare`, `truncateHash`. Hash is validated at generation and on restore; tampered Qards are rejected before decryption. The app surfaces a green shield indicator and prints a truncated fingerprint on physical cards for visual spot-checking (premium-only UI). When recovery metadata is present, the restore form shows a per-set countdown ("X of K added — Y more required"). Card visuals do **not** print K/N — by design, that info lives in the QR data only.

## Recover Lifeboat Compatibility (hard invariant)

The **seQRets Recover** lifeboat (`../Recover`, separate repo) is deliberately pinned to
OLDER crypto than this app — `@noble/ciphers` 0.4.0 / `@noble/hashes` 1.4.0 vs. this repo's
2.2.0 / 1.8.0. That divergence is intentional: a lifeboat that chases dependency bumps can
break in a year nobody is watching.

**The invariant: a Qard created by this app must open in the current Recover.** It is the
single most important promise in the product — every other guarantee is downstream of an
heir actually getting the secret back.

That is enforced by committed fixtures, not by hope:

```bash
npm run fixtures:recover     # mint real Qards here → ../Recover/tests/fixtures/qards.json
cd ../Recover && npm test    # replay them through Recover's older pinned crypto
```

**Regenerate the fixtures whenever** the share format changes (`SHARE_FORMAT_VERSION`,
padding, metadata segments, payload shape), this app's crypto dependencies move, or you cut
a release — then review the diff and commit it in the Recover repo. Recover's CI runs the
suite on every PR and its GitHub Pages deploy is gated on it.

If a format change genuinely cannot be read by the shipped Recover, that is a **release
blocker**, not a fixture to update: bump `SHARE_FORMAT_VERSION` so old copies fail loudly
with "update your recovery tool" instead of misparsing, and ship a matching Recover first.

## Common Gotchas

- `getApiKey()` is async (keychain IPC) — handle `null` pending state
- `h-full` doesn't work in flex parents — use `flex-1 min-h-0`
- React StrictMode causes double-mount in dev
