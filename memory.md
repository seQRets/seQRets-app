# seQRets — Developer Memory File

> Quick-reference for AI assistants and future sessions. Last updated: v1.4.5 (March 12, 2026).

---

## Project Overview

**seQRets** is a zero-knowledge crypto inheritance app. Users enter a secret (seed phrase, private key, etc.), encrypt it client-side with XChaCha20-Poly1305 + Argon2id, split it via Shamir Secret Sharing into QR-code "Qards," and distribute those Qards to heirs. An optional inheritance plan (also encrypted) documents how to reassemble.

- **Monorepo** with npm workspaces: `packages/*`
- **Web app**: Next.js 16 (static export) at `src/`
- **Desktop app**: Tauri 2.10 + Vite + React at `packages/desktop/`
- **Shared crypto**: `@seqrets/crypto` at `packages/crypto/`
- **JavaCard applet**: `packages/javacard/` (smart card storage)
- **License**: AGPL-3.0-or-later
- **Repo**: https://github.com/seQRets/seQRets-app
- **Landing page repo**: https://github.com/seQRets/seqrets-landing-page
- **Live web app**: https://app.seqrets.app
- **Landing page**: https://seqrets.app
- **YouTube**: https://www.youtube.com/@SVRNMoney

---

## Architecture Quick Reference

### Directory Layout

```
/
├── src/                          # Next.js web app
│   ├── app/                      #   App Router pages & components
│   │   ├── components/           #   UI components (web)
│   │   ├── about/page.tsx        #   About page
│   │   ├── support/page.tsx      #   Ask Bob full page (web)
│   │   └── go-pro/page.tsx       #   Go Pro page
│   ├── ai/flows/                 #   Bob AI system prompt (web)
│   │   └── ask-bob-flow.ts
│   └── lib/                      #   Shared types & utilities
├── packages/
│   ├── crypto/                   # @seqrets/crypto (tsup build)
│   │   └── src/crypto.ts         #   XChaCha20 + Argon2id + Shamir
│   ├── desktop/                  # Tauri desktop app
│   │   ├── src/                  #   React frontend (Vite)
│   │   │   ├── components/       #     UI components (desktop)
│   │   │   ├── pages/            #     Route pages (react-router-dom)
│   │   │   ├── lib/              #     API wrappers, utilities
│   │   │   └── App.tsx           #     Router setup
│   │   └── src-tauri/            #   Rust backend
│   │       ├── src/
│   │       │   ├── main.rs       #     Tauri app entry
│   │       │   └── smartcard.rs  #     PC/SC smart card driver
│   │       ├── Cargo.toml
│   │       └── tauri.conf.json   #     Window config, app metadata
│   └── javacard/                 # JavaCard applet source
├── package.json                  # Root workspace config
├── tailwind.config.ts
├── tsconfig.json                 # Web: @/* → ./src/*
└── next.config.mjs
```

### Key Differences: Web vs Desktop

| Aspect | Web (Next.js) | Desktop (Tauri + Vite) |
|---|---|---|
| Router | Next.js App Router | react-router-dom (`BrowserRouter`) |
| API key storage | `localStorage` (sync) | OS keychain via Tauri IPC (async) |
| `getApiKey()` | Synchronous | `async` → returns `Promise<string\|null>` |
| Smart card | Not available | PC/SC via Rust backend |
| Bob AI prompt | `src/ai/flows/ask-bob-flow.ts` | `packages/desktop/src/lib/bob-api.ts` |
| Image component | `next/image` (`<Image>`) | `<img>` tag |
| Link component | `next/link` (`<Link href>`) | `react-router-dom` (`<Link to>`) |

### Bob AI (Gemini Integration)

Both web and desktop embed a multi-section system prompt as a template literal string in their respective `ask-bob-flow.ts` / `bob-api.ts` files. The prompt includes app features, security architecture, inheritance planning knowledge, and the current version. **Both files must be updated in sync** when changing Bob's knowledge.

Chat history: `localStorage['bob-chat-history']` — shared between the popover and full page via `StorageEvent` listener.

### Inheritance Plan

- **Data model**: `InheritancePlan` interface in `packages/desktop/src/lib/inheritance-plan-types.ts`
- **Current version**: 2 (v1→v2 added `deviceAccounts` field)
- **Migration**: `inheritance-plan-utils.ts` → `rawInstructionToPlan()` injects missing fields
- **8 sections**: Beneficiaries, Recovery Credentials, Device & Account Access, Qard Locations, Digital Assets, How to Restore, Professional Contacts, Personal Message
- **Encryption**: XChaCha20-Poly1305 + Argon2id pipeline, stored on smart card or file

### Smart Card (JavaCard)

- **Applet**: `packages/javacard/src/com/seqrets/card/SeQRetsApplet.java`
- **PIN system**: 5 attempts max, 8-16 character PIN, permanent lock at 0 retries
- **Recovery**: `forceEraseCard()` — factory reset always allowed without PIN
- **Multi-item storage**: Multiple items (shares, vaults, instructions) per card
- **Rust driver**: `packages/desktop/src-tauri/src/smartcard.rs`
- **Frontend**: `smartcard-dialog.tsx` (popover) + `SmartCardPage.tsx` (full page)
- **Target card**: NXP J3H145 (JCOP3) — 144K EEPROM, JavaCard 3.0.4, GlobalPlatform 2.2.1, dual interface
- **Target reader**: Identiv SCR3310 v2.0 — ISO 7816, PC/SC, CCID, USB-A and USB-C variants

---

## Landing Page (separate repo)

**Repo**: https://github.com/seQRets/seqrets-landing-page
**Stack**: Vite + React + react-router-dom + Tailwind + shadcn/ui + Framer Motion
**Local dev**: `npm run dev` (port 8080)
**Local path**: `/Users/macuser/Documents/Dev/seqrets Web Dev`

### Key Files

- `src/lib/stripe.ts` — Product catalog (9 products), Stripe checkout helper, `SHOP_LIVE` toggle
- `src/lib/waitlist.ts` — Waitlist API helper (posts to Cloudflare Worker, mailto fallback)
- `src/components/WaitlistButton.tsx` — Reusable waitlist CTA with modal popup
- `src/pages/Shop.tsx` — Shop page with bundles + accessories grid
- `src/components/landing/HeroSection.tsx` — Landing hero with waitlist CTA
- `src/components/landing/ComparisonTable.tsx` — Web vs Desktop feature comparison with waitlist modal
- `src/components/landing/DesktopCTA.tsx` — Desktop app CTA section
- `src/components/landing/Footer.tsx` — Footer with GitHub, YouTube, email links
- `public/sitemap.xml` — Covers all 6 routes
- `public/admin.html` — Waitlist admin dashboard (secret-protected)
- `public/robots.txt` — Includes sitemap reference and admin.html noindex
- `.env.local` — Contains `VITE_STRIPE_PUBLISHABLE_KEY`, `VITE_CHECKOUT_API_URL`, `VITE_WAITLIST_API_URL`
- `.env.example` — Template for above

### Env Vars (Vite — baked at build time, requires dev server restart)

```
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...
VITE_CHECKOUT_API_URL=https://seqrets-checkout.YOUR_SUBDOMAIN.workers.dev
VITE_WAITLIST_API_URL=https://seqrets-waitlist.baton-banker-hazy.workers.dev
```

---

## Cloudflare Workers

### Waitlist Worker (`workers/waitlist/`)

- **URL**: `https://seqrets-waitlist.baton-banker-hazy.workers.dev`
- **Files**: `worker.ts`, `wrangler.toml`
- **KV namespace**: `WAITLIST` (binding in `wrangler.toml`)
- **Secret**: `ADMIN_SECRET` (set via `wrangler secret put ADMIN_SECRET`)
- **Endpoints**:
  - `POST /` — Public. Accepts `{email, source}`, validates, deduplicates, stores in KV
  - `GET /` — Admin (requires `X-Admin-Secret` header). Lists all entries with metadata
  - `DELETE /` — Admin (requires `X-Admin-Secret` header). Accepts `{email}`, removes from KV
  - `OPTIONS /` — CORS preflight
- **CORS origins**: `seqrets.app`, `localhost:5173`, `localhost:8080`, `localhost:9002`
- **Deploy**: `cd workers/waitlist && npx wrangler deploy`
- **CLI note**: Wrangler v4 uses spaces not colons (`wrangler kv namespace create`, not `kv:namespace`)
- **KV gotcha**: `wrangler kv key list` may return empty even when data exists. Use the GET endpoint or Cloudflare dashboard to verify.

### Checkout Worker (not yet deployed)

- Will handle Stripe checkout sessions
- Deploy when Stripe products are created with real `price_` IDs

---

## Waitlist Admin Dashboard

- **Location**: `public/admin.html` (deployed at `seqrets.app/admin.html`)
- **Auth**: Requires `ADMIN_SECRET` passphrase (same as Worker secret)
- **Features**: Login screen, total/today/top-source stats, searchable table, delete with 2-click confirm, CSV export, refresh
- **Change password**: `cd workers/waitlist && npx wrangler secret put ADMIN_SECRET`
- **Data stored in Cloudflare KV** (cloud, not local — survives machine failure)
- **Hidden from search engines**: `<meta name="robots" content="noindex">` + `robots.txt Disallow`

---

## Stripe Integration & Shop

### Product Catalog (9 products in `src/lib/stripe.ts`)

**Bundles:**

| Slug | Name | Ceiling Price | Contents |
|---|---|---|---|
| `desktop-app` | Desktop App | $49 | Signed binary, auto-updates, smart card support |
| `backup-bundle` | Backup Bundle | $129 | App + 2 cards + reader + guide |
| `inheritance-bundle` | Inheritance Bundle | $249 | App + 5 cards + reader + guide + envelopes + fireproof case |

**Accessories:**

| Slug | Name | Ceiling Price |
|---|---|---|
| `smart-card` | Smart Card | $29 |
| `smart-card-3pack` | Smart Card 3-Pack | $69 |
| `usb-card-reader` | USB Card Reader | $29 |
| `tamper-evident-envelopes` | Tamper-Evident Envelopes (5-pk) | $14.99 |
| `fireproof-case` | Fireproof Case | $49 |
| `inheritance-guide` | Inheritance Guide (PDF) | $19 |

### Pricing Strategy

- **All prices are estimated ceilings** (`priceFinal: false`) — will be finalized after supplier quotes
- **Razor/blade model**: App is paid but positioned as gateway to hardware ecosystem
- **Revenue focus**: Smart cards and accessories (especially future premium media: titanium, steel, copper)
- **No subscriptions**: One-time purchases only — aligns with privacy/sovereignty ethos
- **Competitive reference**: Keycard.tech charges €25/card (~$27), €60/3-pack (~$65), €22/reader (~$24)
- **`SHOP_LIVE` toggle**: `false` — all "Add to Cart" buttons show "Join Waitlist" instead
- **Shop page**: Shows prices with "or less" label when `priceFinal: false`
- **Price IDs**: All set to `price_REPLACE_ME` — update after creating products in Stripe Dashboard

### Cart System

- `CartContext` with `useReducer` + `localStorage` persistence
- `CartDrawer` slide-out panel + `CartIcon` floating button
- Checkout via Cloudflare Worker → Stripe Checkout Sessions

---

## Hardware Sourcing (not yet started)

### Smart Card Suppliers to Contact

| Supplier | URL | Notes |
|---|---|---|
| FUTAKO | javacardsdk.com | Taiwan, MOQ 5, ~$2-4/unit at volume |
| Smartcard Focus | smartcardfocus.com | UK, singles OK, ~$8-12/unit, good for prototyping |
| CardLogix | cardlogix.com | Irvine CA, custom branding/printing |
| JavaCardOS / Feitian | javacardos.com | China, MOQ 5, ~$3-5/unit |
| Satochip | satochip.io | Belgium, DIY/crypto focused |

### Key Requirements

- JavaCard 3.0.4+ (minimum for applet)
- Default test keys must be included (otherwise can't load applet)
- Contact interface required (dual-interface OK — NFC side unused)
- 144K+ EEPROM for multi-item storage
- USB reader: Identiv SCR3310 v2.0 or equivalent (ISO 7816, PC/SC, CCID)

---

## Version Management

**All 13+ files must be updated for version bumps:**

```bash
# Quick find of version references (exclude node_modules, .git, lock files):
grep -r "1\.4\.3" --include="*.{json,toml,tsx,ts,md}" --exclude-dir={node_modules,.git,.next,out,target}

# Files to update:
package.json                                    # root
packages/crypto/package.json
packages/desktop/package.json
packages/desktop/src-tauri/Cargo.toml
packages/desktop/src-tauri/tauri.conf.json
src/ai/flows/ask-bob-flow.ts                    # Bob system prompt (web)
packages/desktop/src/lib/bob-api.ts             # Bob system prompt (desktop)
src/app/about/page.tsx                          # About page (web)
packages/desktop/src/pages/AboutPage.tsx         # About page (desktop)
src/app/components/app-footer.tsx                # Footer (web)
packages/desktop/src/components/app-footer.tsx   # Footer (desktop)
README.md
BUILDING.md
SECURITY_ANALYSIS.md

# Then regenerate lock files:
npm install --package-lock-only
cd packages/desktop/src-tauri && cargo generate-lockfile
```

**Caution**: Don't replace version strings in dependency references like `html2canvas: ^1.4.1` or `@jridgewell/sourcemap-codec: ^1.4.14`. Use targeted `sed` or manual replacement.

---

## Development Commands

```bash
# Web dev server (port 9002)
npm run dev

# Landing page dev server (port 8080)
cd "/Users/macuser/Documents/Dev/seqrets Web Dev" && npm run dev

# Desktop dev server (Tauri + Vite)
cd packages/desktop && npm run tauri:dev
# or from root:
npm run desktop:dev

# TypeScript check (desktop)
npx tsc --noEmit -p packages/desktop/tsconfig.json

# TypeScript check (web)
npx tsc --noEmit

# TypeScript check (landing page)
cd "/Users/macuser/Documents/Dev/seqrets Web Dev" && npx tsc --noEmit

# Build crypto package (prerequisite for other builds)
npm run build:crypto

# Production build
npm run build              # web
npm run desktop:build      # desktop

# Deploy waitlist Worker
cd workers/waitlist && npx wrangler deploy

# List waitlist emails (CLI)
cd workers/waitlist && npx wrangler kv key list --binding WAITLIST

# Change admin password
cd workers/waitlist && npx wrangler secret put ADMIN_SECRET
```

**Note**: Tauri window config changes (`tauri.conf.json`) require a full restart of `tauri dev` — they don't hot-reload. CSS/React changes hot-reload via Vite HMR.

**Note**: Vite env vars (`VITE_*`) are baked in at dev server startup. Changes to `.env.local` require restarting the dev server.

---

## Common Gotchas

1. **Desktop `getApiKey()` is async** — OS keychain access via Tauri IPC. This means `hasApiKey` starts as `null` on desktop, creating an async gap. The web version reads from localStorage synchronously. Components that depend on API key state need to handle the `null` (pending) state.

2. **Bob prompt files must stay in sync** — `ask-bob-flow.ts` (web) and `bob-api.ts` (desktop) have nearly identical system prompts. When updating Bob's knowledge, update BOTH.

3. **`h-full` doesn't work in flex parents** — CSS `height: 100%` doesn't resolve against flex-computed parent heights. Use `flex-1 min-h-0` for components inside flex containers (learned from the Ask Bob full page layout bug).

4. **html2canvas SVG issues** — html2canvas misrenders inline SVGs in PNG exports. Use emoji or text alternatives for icons in the QR card export template.

5. **React StrictMode** — Desktop uses `React.StrictMode` in `main.tsx`, causing double-mount in dev. Effects run twice. Keep effects idempotent.

6. **Working directory** — Some commands (`cargo generate-lockfile`) change cwd. Always use absolute paths or prefix with `cd /path &&` in scripts.

7. **Inheritance plan version migration** — When adding fields to `InheritancePlan`, bump `INHERITANCE_PLAN_VERSION` and add migration logic in `rawInstructionToPlan()`. Backward migration isn't needed (app hasn't been publicly released).

8. **Wrangler v4 syntax** — Uses spaces not colons: `wrangler kv namespace create` not `wrangler kv:namespace create`.

9. **Vite env vars require restart** — `VITE_*` variables in `.env.local` are baked at build/dev start time. If you change them, you must restart the dev server (`Ctrl+C` then `npm run dev`).

10. **`wrangler kv key list` unreliable** — May return empty even when data exists. Use the Worker's GET endpoint or the Cloudflare dashboard KV browser to verify entries.

---

## UI Component Patterns

- **UI library**: shadcn/ui (Radix primitives + Tailwind)
- **Icons**: Lucide React
- **Theme**: Dark/light via `next-themes` (web) and custom `ThemeProvider` (desktop)
- **Toast**: `useToast()` hook from shadcn
- **Card pattern**: Digital Assets and Device & Account Access sections use repeatable card entries with add/remove functionality
- **QR card export**: HTML template string → `html2canvas` → PNG blob → download. Separate canvas-based renderer for the web version.
- **WaitlistButton**: Reusable modal CTA component accepting `source`, `label`, `className`, `icon` props. Used across hero, comparison table, desktop CTA, and shop page.

---

## GitHub

- **App repo**: https://github.com/seQRets/seQRets-app
- **Landing page repo**: https://github.com/seQRets/seqrets-landing-page
- **Releases**: https://github.com/seQRets/seQRets-app/releases
- **Branch protection**: Main branch has PR requirement (bypassed for direct pushes)
- **CLI**: `gh` authenticated and working for releases, PR creation, etc.

---

## Launch Status (as of March 8, 2026)

### Completed
- Landing page live at seqrets.app
- Web app live at app.seqrets.app
- Waitlist email capture (Cloudflare Worker + KV) with admin dashboard
- All mailto-based CTAs replaced with API-backed WaitlistButton
- Sitemap, tightened hero copy, YouTube footer link
- Shop page with 9 products (3 bundles + 6 accessories), ceiling prices, "or less" labels
- Stripe integration scaffolded (CartContext, checkout Worker code, `SHOP_LIVE` toggle)

### Pending
- Stripe product creation in dashboard (need real `price_` IDs)
- Smart card & reader supplier outreach and quotes
- Fulfillment/packaging house research
- Desktop app code signing and release builds
- Analytics setup (Plausible/Umami)
- JSON-LD structured data
- YouTube launch content for @SVRNMoney
- Remove localhost origins from waitlist Worker CORS before production

### After Launch

**Analytics (privacy-respecting)**
- Plausible or Umami — Cookie-free, GDPR-compliant. Need signal on user flow completion vs. drop-off.

**Features**
- QR card templates — Custom labels, branding, layouts (wallet-size, full page, multi-card sheet)
- Guided inheritance plan builder — Wizard → printable instruction document alongside Qards

**Growth**
- SEO content — Blog posts: "How to set up Bitcoin inheritance," "Shamir's Secret Sharing explained"
- Publish @seqrets/crypto to npm — Already in roadmap
- GitHub community — CONTRIBUTING.md, issue templates, discussions
- Bug bounty program — Informal: "report vulnerabilities to security@seqrets.app and we'll credit you"

**UX Iteration**
- User testing — 3-5 people using the app for the first time
- Progressive disclosure — Hide advanced options behind an "Advanced" toggle
