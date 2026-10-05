# AGENTS.md - contrac-slayer (ContractorOps frontend)

Guidance for coding agents working in this repository. Read this fully before making changes.

## What this repo is

The ContractorOps web app: a Next.js **PWA + marketing site** for an AI back office for
service-trade contractors (remodeling, plumbing, HVAC, landscaping, roofing, electrical).
One Next.js app serves both surfaces:

- **Product app** (authenticated, cookie session): dashboard, leads, quotes, proposals,
  invoices, projects, calendar, clients, crew, tasks, workflows, billing, settings,
  Frontline (AI receptionist), and the lead-generator agent (outreach campaigns).
- **Public marketing site**: landing page, `/features/*`, `/enterprise`, `/blog`,
  pricing (landing sections), `/privacy`, `/terms`, `/support`.
- **Public, unauthenticated customer flows**: quote/invoice views, client portal
  (`/client/[token]`), crew portal (`/crew/portal/[uuid]`), booking (`/book/[slug]`),
  quote-request forms, team invites, proposal share links.

This repo is the **frontend only**. It talks to two backends over HTTP:

- **ContractorBackend** (FastAPI, local dev on `:4000`, path prefix `/api`) - the main API.
- **contractor-ai** (voice/SMS service) - via `NEXT_PUBLIC_CONTRACTOR_AI_API_URL`.

## Tech stack

- **Next.js 16** (App Router, Turbopack) + **React 19** + **TypeScript** (strict)
- **Tailwind CSS v4** (PostCSS plugin, no `tailwind.config`; theme lives in CSS)
- **shadcn/ui** (`components/ui`, "new-york" style, lucide icons) + Radix primitives
- **next-intl v4** for i18n (`en` + `es`)
- React Hook Form + zod for forms; Recharts for charts; TipTap for rich text;
  framer-motion for animation; sonner for toasts; mapbox-gl for maps
- Node **20+** recommended. Install with `npm install` (`.npmrc` sets
  `legacy-peer-deps=true` - keep it).

## Commands

```bash
npm install          # install deps (legacy-peer-deps is required)
npm run dev          # next dev on :3000
npm run devclean     # kill :3000, remove .next/dev/lock, then next dev (fix wedged dev server)
npm run build        # production build; type errors FAIL the build (ignoreBuildErrors: false)
npm run lint         # eslint . (Next core-web-vitals + react-hooks rules)
npm run typecheck    # tsc --noEmit
npm test             # tsx --test tests/**/*.test.ts (sets NEXT_PUBLIC_CONTRACTOR_AI_API_URL=http://localhost:8000)
```

Before opening a PR: `npm run lint`, `npm run typecheck`, `npm test`, and if you touched
runtime code, `npm run build`. There is no CI gate that replaces these - run them locally.

## Repository layout

```
app/                      # Next.js App Router root
  layout.tsx              # Root layout: globals.css, Toaster, Vercel Analytics, GA, TikTok pixel
  globals.css             # THE live global stylesheet (Tailwind v4 theme, CSS vars)
  page.tsx                # Root page (redirects into /[locale])
  [locale]/               # All localized routes: /en/..., /es/...
    layout.tsx            # NextIntlClientProvider + Auth/Language/Referral providers + AuthGuard + ConditionalShell
    page.tsx              # Marketing landing page
    (public)/             # Route group for public customer flows (book, businesscontact,
                          #   client/[token], invite/[token], proposals/[id])
    auth/                 # login, signup, verify-otp, forgot/reset-password, profile-setup
    dashboard/  leads/  quotes/  proposals/  invoices/  projects/  clients/  crew/
    calendar/  tasks/  reports/  billing/  settings/  workflows/  availability/
    frontline/            # AI receptionist product surface
    lead-generator-agent/ # Outreach campaigns (list, new, [campaignId] live stream)
    admin/                # Redirects to the contractor-ai backend admin UI
    blog/  enterprise/  features/  privacy/  terms/  support/  delete-account/
  api/                    # Same-origin Next API routes (thin proxies; see Backend integration)
    campaigns/[campaignUuid]/stream/route.ts  # SSE proxy, forwards session cookie
    preview-message/route.ts
    zipcode/route.ts      # Server-side API Ninjas zip lookup (uses API_NINJA_KEY)
  book/[slug]/            # Locale-agnostic public booking page (middleware bypasses i18n)
  businesscontact/        # QR/business-card landing (locale-agnostic)
  contacts/[id]/          # Legacy redirect → /[locale]/clients/[id]
  dev/preview/            # Engineering mock preview gallery, host/env gated (see Gotchas)
components/               # Feature components (PascalCase .tsx)
  ui/                     # shadcn/ui primitives - do not restyle ad hoc; extend via cva variants
  dashboard/  frontline/  lead-generator-agent/  proposal/  projects/  quotes/  ...
  conditional-shell.tsx   # Decides whether Navbar/app chrome renders for the current route
  auth-guard.tsx          # Client-side route protection + public-route allowlist
  navbar.tsx  agent-chat-panel.tsx  ...
contexts/                 # React contexts: AuthContext (session user, login/logout),
                          # LanguageContext, ReferralContext
hooks/                    # Custom hooks (use-campaign-stream = SSE client, use-mobile,
                          # use-toast, useContractorOpsNumber, useDebounce, ...)
lib/
  api.ts                  # ALL backend calls go through this ApiClient (~3.6k lines). Never
                          #   fetch() the backend directly from a component.
  types.ts + lib/types/   # Shared TypeScript types mirroring backend models
  utils.ts                # cn() and small helpers
  blog/posts.ts           # Blog content is code: posts are data in this file, images in /public/blog
messages/en.json  es.json # Local fallback translations (large; keyed by feature namespace)
src/i18n.ts               # next-intl request config (locales, backend message overlay)
middleware.ts             # Locale routing + /book, /businesscontact, /dev bypasses
styles/globals.css        # ORPHANED duplicate - not imported anywhere. Edit app/globals.css.
tests/                    # node:test unit tests for pure lib functions (run via tsx)
public/                   # Static assets; public/dev/preview/*.html = estimate mock gallery
docs/ + root *.md         # Feature write-ups (TWILIOUI.md, FOLLOWUP_UI_README.md, etc.)
```

Path alias: `@/*` maps to the repo root (`@/lib/api`, `@/components/ui/button`, ...).

## Routing & i18n

- All product/marketing routes live under `app/[locale]/` with `localePrefix: 'always'`.
  Valid locales: `en`, `es` (unknown locales 404 via the locale layout).
- `middleware.ts` bypasses i18n for `/book/*`, `/businesscontact`, and `/dev/*`, and
  redirects `/en|es/book/<slug>` → `/book/<slug>`. API routes and static files are excluded
  by the matcher.
- Translations: `src/i18n.ts` loads `messages/<locale>.json`, then **deep-merges a backend
  overlay** from `${NEXT_PUBLIC_API_URL}/localization/<locale>` (5-min revalidate) on top.
  Local JSON is the fallback and the source of truth for new keys. Add new strings to
  **both** `en.json` and `es.json`.
- Use `next-intl` APIs (`useTranslations`, `useLocale`, `getMessages`) - no hardcoded
  user-facing copy in components.

### Public vs. authenticated routes

Two client-side allowlists must stay in sync when you add a route that should be reachable
**without login** or **without the app navbar/shell**:

- `components/auth-guard.tsx` - redirects unauthenticated users to `/<locale>/auth/login`
  unless the path matches its public-route list.
- `components/conditional-shell.tsx` - hides Navbar/app chrome on public shell routes
  (booking, auth, legal, marketing, client/crew portals, share links, etc.).

If you add a public page and forget these, real visitors hit a login wall or see the
contractor sidebar. Update both, for both locale-prefixed and legacy non-prefixed paths.

## Backend integration

- **All API calls go through `lib/api.ts`** (`api.<method>()`). It centralizes the base URL,
  error formatting, and credentials. Requests send `credentials: 'include'`; auth is a
  `session` cookie set by the backend at `/auth/login` (see `contexts/AuthContext.tsx`).
- Base URL resolution: `NEXT_PUBLIC_API_URL` (default `http://localhost:4000/api`).
  On Vercel it is set to `/api` (same-origin) and `vercel.json` rewrites proxy it:
  - host `contractorops.ai` / `www.contractorops.ai` → production backend (DigitalOcean)
  - host `dev.frontend.contractorops.ai` (and the fallback rule) → dev backend (Render)
- In the browser, if the configured host is `localhost` but the page is opened from another
  device, the client rewrites the hostname to the current one (LAN/device previews). Keep
  that behavior intact.
- `NEXT_PUBLIC_CONTRACTOR_AI_API_URL` configures the contractor-ai service; some features
  throw if it is unset. `/[locale]/admin` redirects to it (default `http://localhost:5000`).
- SSE: `hooks/use-campaign-stream.ts` consumes `app/api/campaigns/[campaignUuid]/stream`,
  a route that forwards the session cookie to the backend stream. Don't bypass it with a
  direct cross-origin EventSource.
- Other env vars: `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN` (maps/address autocomplete),
  `NEXT_PUBLIC_FRONTEND_URL` (building absolute share links), `NEXT_PUBLIC_WORKFLOWS_ENABLED`
  (gates the workflows UI), `API_NINJA_KEY` (server-only, `/api/zipcode`),
  `NEXT_PUBLIC_SHEETDB_API` (signup lead capture), `NEXT_PUBLIC_BACKEND_WS_ORIGIN`,
  `ALLOW_DEV_PREVIEW` (see Gotchas). `NEXT_PUBLIC_*` values are inlined at build time -
  changing them requires a rebuild/redeploy.

## Conventions

- TypeScript strict; **no `any`** unless unavoidable. Import shared types from `@/lib/types`
  (or `@/lib/types/<area>`); prefer `interface` for object shapes.
- Server components by default; add `"use client"` only when interactivity requires it.
- Components PascalCase (`LeadDetail.tsx`); hooks camelCase with `use` prefix; utilities
  kebab-case; constants UPPER_SNAKE_CASE.
- Keep components single-responsibility; extract reusable logic into `hooks/`; keep state
  local and lift only when needed; use URL state for shareable UI state.
- Forms: React Hook Form + zod + shadcn form components, client-side validation first.
- Styling: Tailwind utility classes; dark mode via the `.dark` custom variant; mobile-first.
  The design uses pure black (`bg-black`) rather than near-black blues in dark contexts.
- Images: `next/image`; remote hosts are allowlisted in `next.config.mjs` (Cloudinary,
  Unsplash, THD, gstatic, serpapi) - add a pattern there if you introduce a new host.
- Blog posts are data, not MDX: add an entry to `lib/blog/posts.ts` and assets under
  `public/blog/<slug>/`. Route is `/[locale]/blog/[slug]`.
- `.cursorrules` is a parallel instruction file kept for Cursor users; keep both files
  consistent when you change conventions. Do not create README/docs files unless asked.

## Testing

- Tests are **node:test** unit tests run through `tsx` (`npm test`), covering pure logic in
  `lib/` (draw math, calendar dates, follow-up activity, discovery review, billing offer,
  ag-ui state, invoice merge). There is no component/E2E harness today.
- Add tests as `tests/<area>.test.ts` importing from `../lib/...`. Mirror the existing
  style: `import { test } from "node:test"` + `assert/strict`.
- Any change to money math (draws, reconciliation, tax, totals) must come with tests that
  cover cent-level rounding - see `tests/draw-math.test.ts` for the expected rigor.

## Build & deployment (Vercel)

- Hosted on Vercel. Merges to **`dev`** deploy to `dev.frontend.contractorops.ai`;
  **`main`** deploys production at `contractorops.ai`.
- `vercel.json` holds the `/api/*` host-based rewrites (see Backend integration). Be careful
  editing it - rule order matters and the no-`has` fallback catches everything else.
- Env vars are managed in Vercel project settings per environment; `NEXT_PUBLIC_*` changes
  only take effect on redeploy.
- `/dev/preview` renders HTML mocks from `public/dev/preview/estimate-*.html` and is gated
  server-side: it 404s unless the host looks like localhost/dev/staging/preview/*.vercel.app
  or `ALLOW_DEV_PREVIEW=true`. Use it for UI mocks instead of shipping them to prod pages.

## Branch & PR workflow

- `dev` is the integration branch for all code, documentation, configuration, and
  agent-authored changes.
- Start work from an up-to-date `origin/dev`, and land changes on `dev` first (via PR).
- When a push target is not explicitly specified, use `dev`.
- Do not push directly to `main` unless the user explicitly requests a production promotion
  after the change has been pushed to and verified on `dev`.
- Promote changes to `main` by merging `dev` through the repository's normal review or
  pull-request process.
- Commit style: short imperative subject (`Fix mobile PWA layouts across workspace screens`);
  squash-merge PRs so subjects end with `(#NNN)`.

## Gotchas

- **Wedged dev server**: `npm run devclean` (kills `:3000`, removes `.next/dev/lock`).
  `portkill.md` has a wider port-kill variant.
- **Two globals.css**: only `app/globals.css` is imported. `styles/globals.css` is a stale
  duplicate - don't edit it.
- **`review-email-ui.tsx`** at the repo root is a stray reference file, not wired into the
  app. Same for `cookies.txt` and `contractopss.code-workspace` - leave them alone.
- **Duplicate route trees**: some legacy locale-agnostic routes exist next to the `[locale]`
  tree on purpose (`app/book`, `app/businesscontact`, `app/contacts` redirect). Check
  `middleware.ts` before assuming a path is locale-scoped.
- **lib/api.ts is huge** (3.6k lines). Find the existing method group before adding one;
  new types go in `lib/types.ts` or the matching `lib/types/<area>.ts`.
- **Hydration**: AuthGuard renders a fixed loading UI on first paint to avoid server/client
  mismatch - preserve that pattern for auth-dependent chrome.
