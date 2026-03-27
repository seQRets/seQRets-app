# seQRets — Developer Memory File

> Quick-reference for AI assistants and future sessions. Last updated: v1.5.0 "Liftoff" (March 27, 2026).

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
│   │   ├── inheritance/page.tsx  #   Inheritance Plan (encrypt/decrypt)
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

Bob's current knowledge includes: PDF export for inheritance plans, smart card integration, BIP-39/BIP-32 fundamentals, inheritance planning guide with legal/tax considerations, and all app features as of v1.4.7.

Chat history: `localStorage['bob-chat-history']` — shared between the popover and full page via `StorageEvent` listener.

### Navigation

- **Web 3-tab nav**: `app-nav-tabs.tsx` — Secure Secret / Inheritance Plan / Restore Secret (responsive short labels on mobile)
- **Web hamburger menu**: `src/app/components/header.tsx` — hides current page, shows Go Pro link
- **Desktop hamburger menu**: `packages/desktop/src/components/header.tsx` — hides current page, shows Smart Card link
- **Desktop nav tabs**: `packages/desktop/src/components/app-nav-tabs.tsx`
- **Web routes**: `/` (home), `/inheritance`, `/about`, `/support`, `/go-pro`, `/privacy`, `/terms`
- **Desktop routes**: `/` (home), `/inheritance`, `/about`, `/support`, `/smartcard`
- **Upsell notices**: Brief desktop app upgrade links (`seqrets.app/shop`) in `inheritance/page.tsx`, `create-shares-form.tsx`, `restore-secret-form.tsx`

### Inheritance Plan

- **Data model**: `InheritancePlan` interface in `packages/desktop/src/lib/inheritance-plan-types.ts`
- **Current version**: 2 (v1→v2 added `deviceAccounts` field)
- **Migration**: `inheritance-plan-utils.ts` → `rawInstructionToPlan()` injects missing fields
- **8 sections**: Beneficiaries, Recovery Credentials, Device & Account Access, Qard Locations, Digital Assets, How to Restore, Professional Contacts, Personal Message
- **Encryption**: XChaCha20-Poly1305 + Argon2id pipeline, stored on smart card or file
- **PDF export** (desktop only): `packages/desktop/src/lib/generate-plan-pdf.ts` — jsPDF, Letter portrait, 8 sections with auto-pagination and tables
- **Web app**: File encrypt/decrypt only (no plan builder); upsell notice links to desktop app

### Smart Card (JavaCard)

- **Applet**: `packages/javacard/src/com/seqrets/card/SeQRetsApplet.java`
- **PIN system**: 5 attempts max, 8-16 character PIN, permanent lock at 0 retries
- **Wipe protection**: Opt-in flag (`INS_SET_WIPE_PROTECT` 0x23) gates `INS_ERASE_DATA` behind PIN verification. Default off. When enabled + card locked = permanently inaccessible by design.
- **Recovery**: `forceEraseCard()` — factory reset allowed without PIN unless wipe protection is enabled
- **Multi-item storage**: Multiple items (shares, vaults, instructions) per card
- **Rust driver**: `packages/desktop/src-tauri/src/smartcard.rs`
- **Frontend**: `smartcard-dialog.tsx` (popover) + `SmartCardPage.tsx` (full page, 3-tab layout: Status / Security / Advanced)
- **Build**: `cd packages/javacard && JAVA_HOME=/opt/homebrew/opt/openjdk@11/libexec/openjdk.jdk/Contents/Home ant build` → `build/SeQRetsApplet.cap`
- **Install**: `java -jar tools/gp.jar --delete F053515254530100 --force && java -jar tools/gp.jar --install build/SeQRetsApplet.cap`
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

**All 18 files must be updated for version bumps (as of v1.4.7):**

```bash
# Quick find of version references (exclude node_modules, .git, lock files):
grep -r "1\.4\.7" --include="*.{json,toml,tsx,ts,md,js}" --exclude-dir={node_modules,.git,.next,out,target}

# ── Config files (5) ──
package.json                                    # root workspace
packages/crypto/package.json
packages/desktop/package.json
packages/desktop/src-tauri/Cargo.toml
packages/desktop/src-tauri/tauri.conf.json

# ── UI components — version + codename (4) ──
src/app/components/app-footer.tsx                # Footer (web)
packages/desktop/src/components/app-footer.tsx   # Footer (desktop)
src/app/about/page.tsx                          # About page (web)
packages/desktop/src/pages/AboutPage.tsx         # About page (desktop)

# ── Bob AI system prompts — version + codename (2) ──
src/ai/flows/ask-bob-flow.ts                    # Bob system prompt (web)
packages/desktop/src/lib/bob-api.ts             # Bob system prompt (desktop)

# ── Documentation (3) ──
README.md
BUILDING.md
SECURITY_ANALYSIS.md

# ── Service worker — version in cache name (1) ──
public/sw.js                                    # 2 occurrences (CACHE_NAME + comment)

# ── Project memory (1) ──
memory.md                                       # This file

# ── Lock files — regenerate, don't manually edit (2) ──
npm install --package-lock-only                 # → package-lock.json
# Cargo.lock — edit in place or: cd packages/desktop/src-tauri && cargo generate-lockfile
```

**Codenames** appear in footer, about page, and Bob AI files (6 files total). Update alongside version.

**Caution**: Don't blindly `sed` version strings — dependency references like `html2canvas: ^1.4.1` or `@jridgewell/sourcemap-codec: ^1.4.14` will be corrupted. Use targeted replacement on the specific files listed above.

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

11. **Next.js Turbopack + PWA service worker caching** — After route renames or component changes, the browser may serve stale code despite server restarts and `.next` deletion. Fix: clear service worker caches via `caches.keys()` → `caches.delete()` and `navigator.serviceWorker.getRegistrations()` → `unregister()`, then reload.

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

## Launch Status (as of March 13, 2026)

### Completed
- Landing page live at seqrets.app
- Web app live at app.seqrets.app
- Waitlist email capture (Cloudflare Worker + KV) with admin dashboard
- All mailto-based CTAs replaced with API-backed WaitlistButton
- Sitemap, tightened hero copy, YouTube footer link
- Shop page with 9 products (3 bundles + 6 accessories), ceiling prices, "or less" labels
- Stripe integration scaffolded (CartContext, checkout Worker code, `SHOP_LIVE` toggle)
- Desktop PDF export for inheritance plan (jsPDF, 8-section layout with tables)
- Route renamed: `/instructions` → `/inheritance` (web + desktop)
- 3-tab nav bar (Secure / Inheritance Plan / Restore) on home + inheritance pages
- Hamburger menus restructured: current page hidden, Inheritance Plan in top group
- Mobile nav responsive (short labels on <640px: Secure / Inherit / Restore)
- Desktop app upsell notices in web app (inheritance page, create results, restore step 1) linking to seqrets.app/shop

### Security Audit (v1.4.7)

- **Report**: `security-audit-report.html` in repo root
- **12 findings**: 0 Critical, 2 High, 4 Medium, 3 Low, 3 Informational
- **F-01** (High): ERASE_DATA bypasses PIN — **FIXED** (16f8672) with opt-in wipe protection flag
- **F-02** (High): Gemini API key in localStorage — **FIXED** (f1830ea) added "Remember this key" toggle with session-only in-memory mode
- **F-03** (Medium): secureWipe JS string immutability — **FIXED** (1522b9c) added clarifying documentation comments to all 4 secureWipe functions
- **F-04** (Medium): Decompressed plaintext not zeroized in Rust — **FIXED** (c7ca4f3)
- **F-05** (Medium): PIN comparison leaks length via timing — pending
- **F-06** (Medium): No CSP for web app on GitHub Pages — **Won't fix** (accepted risk; GitHub Pages doesn't support custom headers; Cloudflare migration failed)
- **F-07** (Low): Clipboard read-back exposes secret twice — pending
- **F-08** (Low): Broad Tauri fs write permissions — **Won't fix** (accepted risk; requires compromised npm dep to exploit)
- **F-09** (Low): Negligible modular bias in password gen — pending
- **F-10** (Info): Stack traces in worker error messages — pending
- **F-11** (Info): Chat history persisted to localStorage — pending
- **F-12** (Info): Compressed plaintext not zeroized in Rust — **FIXED** (c7ca4f3)

### Pending
- Security audit findings F-05, F-07, F-09, F-10, F-11
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

**Growth**
- SEO content — Blog posts: "How to set up Bitcoin inheritance," "Shamir's Secret Sharing explained"
- Publish @seqrets/crypto to npm — Already in roadmap
- GitHub community — CONTRIBUTING.md, issue templates, discussions
- Bug bounty program — Informal: "report vulnerabilities to security@seqrets.app and we'll credit you"

**UX Iteration**
- User testing — 3-5 people using the app for the first time
- Progressive disclosure — Hide advanced options behind an "Advanced" toggle
