# Claude Developer Knowledge Base
## Real Estate SaaS — Developer Reference

> This file is the single source of truth for any AI assistant (Claude or otherwise) working on this codebase.
> Read this file completely before writing any code, making any architectural decision, or suggesting any change.

---

## 1. Project Overview

A **Persian-language, RTL, PWA-based SaaS** platform for Iranian real estate offices.

- **Users:** Real estate agents (مشاور) on mobile + office managers (مدیر املاک) on desktop
- **Core job:** Create, manage, share, and close property listings ("files" / فایل)
- **Market:** Iran — Farsi only, RTL, Jalali calendar, Iranian third-party services only
- **Platform:** Progressive Web App (PWA) — no native iOS/Android app in v1
- **Status:** Greenfield — no existing code

---

## 2. Tech Stack

| Layer | Technology | Notes |
|-------|-----------|-------|
| **Framework** | Next.js (App Router) | v14+, React 18, Server Components |
| **Language** | TypeScript (strict mode) | `.ts` / `.tsx` everywhere. No `.js` files. |
| **Styling** | Tailwind CSS + shadcn/ui | shadcn components are copied into `/components/ui/`, not a package dependency |
| **State** | React Context (auth/user) + SWR or React Query (server data) | No Redux |
| **Forms** | React Hook Form + Zod | Zod schemas used for both client validation and API input validation |
| **Auth** | NextAuth.js (Auth.js v5) — credentials provider | Username + password. httpOnly cookies. |
| **Database** | PostgreSQL | Hosted on IranServer |
| **ORM** | Prisma | Type-safe queries, migrations via `prisma migrate` |
| **Image Processing** | Sharp | Server-side only, inline in API routes |
| **Offline Storage** | Dexie.js | IndexedDB wrapper for local draft saving |
| **Font** | Vazirmatn | Variable font, loaded via `next/font/local` |
| **Calendar** | date-fns-jalali | Jalali display. All DB dates stored as ISO 8601 (Gregorian). |
| **PWA** | next-pwa | Service worker, push notifications, installability |
| **Notifications** | PWA push (background) + 30s polling (in-app) | No WebSockets in v1 |
| **Linting** | ESLint (Next.js config) | |
| **Formatting** | Prettier | |

---

## 3. Third-Party Services

| Service | Purpose | Notes |
|---------|---------|-------|
| **AvalAI** | LLM for AI description generation | Persian-accessible AI API. Primary. Template fallback if fails. |
| **Neshan (نشان)** | Maps, location pin, POI data, routing | Iranian map. No Google Maps. |
| **KaveNegar** | SMS sending | Only SMS provider used. |
| **Zarinpal (زرین‌پال)** | Subscription payments | Only payment gateway used. |
| **IranServer** | VPS, PostgreSQL, object storage, domain | All infrastructure is on IranServer. No foreign cloud. |

---

## 4. Infrastructure & Deployment

- **Hosting:** IranServer VPS (Node.js process managed by PM2)
- **Build output:** Next.js `standalone` mode
- **Database:** PostgreSQL on IranServer
- **File storage:** IranServer S3-compatible object storage
- **Domain:** IranServer
- **Share page domain:** Separate domain `view.[appname].ir` (not the main app domain)
- **Env secrets:** `.env.local` for development (git-ignored). Production secrets set as VPS environment variables directly.
- **No Docker** in v1

---

## 5. Project Folder Structure

```
/
├── app/
│   ├── (auth)/                  # Auth pages — not in app shell
│   │   ├── login/
│   │   └── register/
│   ├── (dashboard)/             # Protected — requires auth
│   │   ├── layout.tsx           # Dashboard shell (sidebar, topbar)
│   │   ├── page.tsx             # Dashboard home
│   │   ├── files/               # File management
│   │   ├── agents/              # Agent management (manager only)
│   │   ├── contracts/           # Contract history
│   │   ├── crm/                 # Customer management
│   │   ├── settings/            # Office profile, billing
│   │   └── reports/             # Financial reports
│   ├── (public)/                # No auth required
│   │   └── p/[token]/           # Public share page (view.appname.ir)
│   ├── api/                     # API routes (Next.js Route Handlers)
│   │   ├── auth/
│   │   ├── files/
│   │   ├── agents/
│   │   ├── contracts/
│   │   ├── crm/
│   │   ├── sms/
│   │   ├── upload/
│   │   └── share/
│   ├── layout.tsx               # Root layout — sets dir="rtl", font, metadata
│   └── globals.css
├── components/
│   ├── ui/                      # shadcn/ui components (do not edit manually)
│   ├── files/                   # File-specific components
│   ├── agents/                  # Agent-specific components
│   ├── crm/                     # CRM-specific components
│   ├── dashboard/               # Dashboard widgets, KPI cards
│   ├── shared/                  # Shared across features (PageHeader, EmptyState, etc.)
│   └── forms/                   # Shared form primitives
├── lib/
│   ├── db.ts                    # Prisma client singleton
│   ├── auth.ts                  # NextAuth config
│   ├── validations/             # Zod schemas (one file per domain entity)
│   ├── sms.ts                   # KaveNegar SMS helpers
│   ├── ai.ts                    # AvalAI description generation helpers
│   ├── maps.ts                  # Neshan API helpers
│   ├── image.ts                 # Sharp processing helpers
│   ├── storage.ts               # IranServer object storage helpers
│   └── utils.ts                 # General utilities (date formatting, Toman formatting, etc.)
├── hooks/                       # Custom React hooks
│   ├── useFiles.ts
│   ├── useNotifications.ts
│   └── useDraft.ts              # Dexie.js offline draft management
├── types/                       # TypeScript type definitions
│   └── index.ts
├── prisma/
│   ├── schema.prisma
│   └── migrations/
├── public/
│   ├── fonts/                   # Vazirmatn font files
│   └── manifest.json            # PWA manifest
├── .env.local                   # Git-ignored. Local secrets only.
├── .env.example                 # Committed. Shows all required env vars without values.
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
├── eslint.config.mjs
└── claude.md                    # This file
```

---

## 6. User Roles & Permissions

```
Super Admin (platform owner)
    └── Mid Admin (support — sees only assigned offices)
        └── مدیر / Manager (subscriber — manages own office)
            └── مشاور / Agent (created by manager)
```

### Key Permission Rules
- **Strict multi-tenancy:** All DB queries MUST include `officeId` filter. No cross-office data leakage.
- **Manager** has all agent permissions plus: assign files, finalize contracts, view financials, view activity log, manage agents, manage office profile.
- **Agent** can: create/edit files, share files, add CRM customers, send SMS.
- **Activity log** is visible to manager only (not agents).
- **Contract finalization** is manager-only.
- **Mid Admin** accesses only offices explicitly assigned to them in the admin panel.
- **Super Admin** has unrestricted cross-tenant access.

---

## 7. Core Data Models (Summary)

### Key Entities
- **Office** — tenant root. Every other entity belongs to an office via `officeId`.
- **User** — manager or agent. Belongs to one office. Has `role: MANAGER | AGENT`.
- **File (فایل)** — property listing. Has `transactionType`, `status`, `officeId`, assigned agents.
- **ShareLink** — each share action creates one. Has `token` (unique), `customPrice`, `viewCount`, `fileId`.
- **Contract** — finalized deal. Linked to a file. Has commission fields, archive attachments.
- **Customer** — CRM contact. Belongs to office. Has `type`, notes, transaction history.
- **ActivityLog** — immutable log of all file changes. `userId`, `fileId`, `action`, `diff`, `timestamp`.
- **PriceHistory** — every price change on a file. `fileId`, `oldPrice`, `newPrice`, `changedAt`.
- **Notification** — per-user notification record. `userId`, `type`, `read`, `createdAt`.
- **Subscription** — one per office. `plan`, `status`, `trialEndsAt`, `currentPeriodEnd`.

### Multi-tenancy Pattern
Every model that contains tenant data has an `officeId` field.
Every API route that accesses tenant data MUST verify the requesting user's `officeId` matches.
Never trust client-supplied `officeId` — always derive it from the authenticated session.

---

## 8. Authentication

- **Library:** NextAuth.js (Auth.js v5) with credentials provider
- **Session strategy:** JWT stored in httpOnly cookie
- **Max sessions per user:** 2 — tracked in DB. On login, if 2 exist, oldest is invalidated.
- **Password reset:** Email link (v1)
- **Password hashing:** bcrypt
- **Session contains:** `userId`, `officeId`, `role` — available in all server components and API routes via `auth()` helper

---

## 9. Key Feature Behaviors

### File Creation (Quick Flow)
**Minimum to save:** transaction type + location pin + 1 contact with phone number.
Everything else optional. File is immediately visible in manager's panel.

### File Editing Model
- Single shared file. Last edit wins. No branching.
- Full activity log on every change (field-level diff).
- Price differences per customer are handled at **share link creation time**, not at file level.

### Share Links
- Each share action = new unique link with its own `customPrice` and `viewCount`.
- Links live at `view.[appname].ir/[token]` (separate domain).
- Link is valid only while file status is `ACTIVE`.
- When file is archived/closed → all its share links deactivate automatically.

### File Status Lifecycle
```
ACTIVE → (manual archive) → ARCHIVED
ACTIVE → (contract finalized as sale) → SOLD
ACTIVE → (contract finalized as rent) → RENTED
ACTIVE → (auto after inactivity) → EXPIRED
```
After contract finalization: assigned agents get read-only access, all share links deactivate.

### Subscription Lifecycle
```
Register → 1-month full trial (no card required)
→ 7 days before end: renewal reminders start
→ Trial/subscription expires → 7-day grace (full access + banner)
→ After grace: read-only lock
→ Data NEVER deleted automatically
```

### Photo Processing (Server-side, Sharp)
1. Client uploads raw image to `/api/upload`
2. Server receives, runs Sharp: compress → normalize dimensions → color enhance → apply watermark
3. Processed image saved to IranServer object storage
4. URL returned to client
5. Processing is synchronous within the API route (v1 — no queue)

### Offline Draft
- Dexie.js stores form state in IndexedDB during file creation
- If connection drops: save to local draft, show indicator
- On reconnect: auto-sync draft to server
- Map, AI generation, and photo upload require online connection (show friendly message if offline)

### AI Description
1. User taps "تولید توضیحات"
2. User selects tone: رسمی (`formal`) / معمولی (`standard`) / جذاب (`compelling`)
3. POST to `/api/ai/description` with file data + tone
4. Backend calls AvalAI (`gpt-4o-mini`, 15s timeout) with a system-role persona message + compact user message; temperature varies by tone (formal=0.3, standard=0.5, compelling=0.7)
5. If AvalAI fails/times out/returns empty → fall back to `buildDescriptionTemplate()` (pure Persian template, never throws)
6. Result is editable in the form

### Location Analysis (Neshan)
- Triggered automatically when location pin is saved
- Calls Neshan API for: walking time to public transport, driving time to airport, nearby POIs
- Show only available data, silently skip missing data
- Results stored on the file, used in AI description and share page

---

## 10. Calendar & Dates

- **Display:** Always Jalali (Shamsi) — use `date-fns-jalali` for all formatting
- **Storage:** Always ISO 8601 / Gregorian in the database
- **Date inputs:** Use a Jalali date picker component
- **Never show Gregorian dates to end users**
- **Example pattern:**
  ```ts
  // Storing
  const isoDate = new Date(); // stored in DB as-is

  // Displaying
  import { format } from 'date-fns-jalali';
  const display = format(isoDate, 'yyyy/MM/dd'); // → e.g. ۱۴۰۴/۱۱/۳۰
  ```

---

## 11. Currency & Numbers

- **Currency:** Toman (تومان) — always display with Persian numerals and تومان suffix
- **Storage:** Store as integer (e.g. 5000000 = 5 million Toman) — no decimals
- **Formatting utility:** Use a shared `formatToman(amount: number): string` in `lib/utils.ts`
- **Persian numerals:** Use `toLocaleString('fa-IR')` for number formatting
- **Example:** `5000000` → `۵,۰۰۰,۰۰۰ تومان`

---

## 12. SMS (KaveNegar)

SMS types:
1. **File share** — sent when agent/manager shares a file link
2. **Post-deal rating request** — manager sends after contract close
3. **Rent follow-up** — 30 days before lease end (manager-triggered)
4. **Custom outreach** — manual

All SMS templates are in Persian. Manager can edit before sending.
Template variables: `{customer_name}`, `{agent_name}`, `{office_name}`, `{link}`, `{price}`, `{property_type}`

---

## 13. Notifications

- **Background:** PWA push notifications via service worker
- **In-app:** Poll `/api/notifications` every 30 seconds
- **No WebSockets in v1**
- Notification bell in top nav, mark as read individually or all

Notification triggers:
- File assigned to agent
- File edited (notify the other party)
- Subscription expiring (7 days) / grace period started
- New customer rating received

---

## 14. RTL Implementation

- Root `<html>` element: `dir="rtl"` and `lang="fa"`
- Tailwind RTL variants used for layout (e.g. `rtl:mr-4` instead of `ml-4`)
- shadcn/ui components are RTL-compatible when `dir="rtl"` is set on root
- Vazirmatn font loaded globally via `next/font/local` in root layout
- Icons: use symmetric icons where possible. Directional icons (arrows, chevrons) must be flipped for RTL using `rtl:scale-x-[-1]`

---

## 15. Coding Conventions

### TypeScript
- **Strict mode always** (`"strict": true` in tsconfig)
- No `any` types — use `unknown` and narrow properly
- All API response types defined in `/types/index.ts`
- Zod schemas in `/lib/validations/` — one file per domain entity
- Parse and validate all incoming API data with Zod before using

### Components
- All React components are `.tsx`
- Use named exports (not default exports) for components
- Props interfaces defined inline above the component or in the same file
- Server Components by default in App Router — add `"use client"` only when needed (interactivity, hooks, browser APIs)

### Functions
- **Small and single-responsibility** — one function, one job
- Extract reusable logic into `/lib/` or `/hooks/`
- Async functions always have proper error handling (try/catch or Result pattern)

### Comments
- Add comments for: complex business logic, non-obvious API behavior, multi-step flows, workarounds
- Do NOT comment obvious code (`// increment counter` above `count++`)
- Comment format: plain English, concise

### UI States — MANDATORY
Every component that fetches data MUST handle all three states:
```tsx
if (isLoading) return <LoadingSpinner />;
if (error) return <ErrorMessage message={error.message} />;
if (!data || data.length === 0) return <EmptyState message="..." />;
// happy path
```
Never render incomplete UI that assumes data is always present.

### API Routes
- All API routes in `/app/api/` using Next.js Route Handlers
- Always verify auth at the start of every route: `const session = await auth(); if (!session) return 401;`
- Always verify `officeId` matches session — never trust client-supplied tenant ID
- Return consistent JSON shape: `{ success: true, data: ... }` or `{ success: false, error: "..." }`
- Validate all inputs with Zod before processing

### Error Handling
- API routes: return appropriate HTTP status codes (400, 401, 403, 404, 500)
- Client: catch all SWR/React Query errors and display user-friendly Persian error messages
- Never expose stack traces or internal error details to the client

---

## 16. Development Workflow

### Branch Strategy
- `main` — always production-ready
- `feature/[feature-name]` — one branch per feature
- Merge directly to main when feature is complete and manually tested

### Feature Development Process
1. Create feature branch from main
2. Build the feature
3. Manual test the feature completely before merging
4. Merge to main
5. Deploy

### Automated Tests
Write automated tests **only** for:
- Authentication flow (login, logout, session, password reset)
- File creation flow (minimum fields, draft saving, sync)
- Contract finalization flow (commission calculation, status changes)

All other testing is manual before merge.

### Environment Variables
Required variables (see `.env.example`):
```
DATABASE_URL=
NEXTAUTH_SECRET=
NEXTAUTH_URL=
AVALAI_API_KEY=
NESHAN_API_KEY=
KAVENEGAR_API_KEY=
ZARINPAL_MERCHANT_ID=
STORAGE_ENDPOINT=
STORAGE_ACCESS_KEY=
STORAGE_SECRET_KEY=
STORAGE_BUCKET_NAME=
NEXT_PUBLIC_SHARE_DOMAIN=
```

---

## 17. Do Not Do (Anti-Patterns)

| ❌ Don't | ✅ Do instead |
|---------|-------------|
| Write `.js` or `.jsx` files | Always use `.ts` / `.tsx` |
| Use Google Maps, Cloudinary, AWS | Use Neshan, Sharp + IranServer storage |
| Store dates in Jalali format in DB | Store ISO 8601, display as Jalali |
| Trust client-supplied `officeId` | Always derive from authenticated session |
| Use WebSockets | Use PWA push + 30s polling |
| Add Redux or any heavy state library | Use React Context + SWR/React Query |
| Skip loading/error/empty states | Always handle all three UI states |
| Write god functions (100+ lines) | Break into small, named, single-purpose functions |
| Use `any` in TypeScript | Use proper types or `unknown` |
| Display Gregorian dates to users | Always display Jalali |
| Display numbers without Toman formatting | Always use `formatToman()` utility |
| Forget to filter by `officeId` in DB queries | Multi-tenancy is enforced at query level |
| Process images client-side | All image processing is server-side (Sharp) |

---

## 18. Key Files Reference

| File | Purpose |
|------|---------|
| `lib/db.ts` | Prisma client singleton — import from here everywhere |
| `lib/auth.ts` | NextAuth config — import `auth()` helper for session |
| `lib/utils.ts` | `formatToman()`, date helpers, general utilities |
| `lib/ai.ts` | AvalAI description generation + template fallback |
| `lib/sms.ts` | KaveNegar SMS sending functions |
| `lib/maps.ts` | Neshan API calls (geocoding, routing, POI) |
| `lib/image.ts` | Sharp processing pipeline (compress, watermark, resize) |
| `lib/storage.ts` | IranServer object storage upload/download/delete |
| `hooks/useDraft.ts` | Dexie.js IndexedDB draft management for file creation |
| `prisma/schema.prisma` | Database schema — source of truth for all models |
| `types/index.ts` | Shared TypeScript types and interfaces |
| `prd.md` | Full Product Requirements Document |
| `generalideas.md` | Original product brainstorm and ideation notes |

---

## 19. Neshan SDK Implementation Notes

- **Package:** `@neshan-maps-platform/mapbox-gl-react` + `@neshan-maps-platform/mapbox-gl` + `@types/mapbox-gl`
- **CSS:** import `@neshan-maps-platform/mapbox-gl/dist/NeshanMapboxGl.css`
- **No SSR** — always use `dynamic(() => import(...), { ssr: false })` in Next.js
- **Map key env var:** `NEXT_PUBLIC_NESHAN_MAP_KEY` (client-side); `NESHAN_API_KEY` (server-side REST)
- **Pin drop:** use `mapSetter` prop to get Map instance → attach click listener → place `new Marker()` from `@neshan-maps-platform/mapbox-gl`
- **Mobile:** set `isTouchPlatform: true` (agents use on mobile)
- **Map types:** `neshanVector` (default), `neshanVectorNight`, `neshanRaster`, `neshanRasterNight`
- **REST API key:** already in `.env` as `NESHAN_API_KEY`
- **Type workaround:** import `type SDKMap from "@neshan-maps-platform/mapbox-gl/dist/src/core/Map"` for `mapSetter` param; use `map as any` for `Marker.addTo(map)` to avoid `@types/mapbox-gl` version conflicts
- **Components:** `NeshanMapPicker` (interactive, pin drop) and `NeshanMapView` (read-only display) are both `"use client"` — wrapped by `LocationPicker` and `MapView` respectively using `dynamic(..., { ssr: false })`

---

## 20. Out of Scope (Do Not Build in v1)

- Phone number / OTP login
- Per-office custom subdomains on share pages
- In-app ticketing / helpdesk
- Native iOS or Android app
- Multi-language support (Farsi only)
- Automated referral commission payouts
- In-app chat
- AI-powered customer-file matching
- Divar / Sheypoor API integration
- Map-based file browsing
- WebSockets / real-time collaboration

---

## 20. Development Progress

> Workflow rule: build one feature at a time, write tests before moving to the next feature.
> Update this section after every feature + test cycle.

### Feature Build Order & Status

| # | Feature | Built | Tested | Notes |
|---|---------|-------|--------|-------|
| 1 | **Authentication** (register, login, session management, 2-session limit, middleware) | ✅ | ✅ | |
| 2 | **Dashboard** (layout, shell, sidebar, topbar, KPI cards, sign-out action) | ✅ | ✅ | |
| 3 | **File Management** (create, edit, list, status lifecycle, activity log) | ✅ | ✅ | |
| 4 | **CRM** (customers, contact history) | ✅ | ✅ | |
| 5 | **Agent Management** (manager-only) | ✅ | ✅ | |
| 6 | **Contracts** (finalization, commission, archive) | ✅ | ✅ | |
| 7 | **Share Links** (public view page, token, custom price) | ✅ | ✅ | |
| 8 | **SMS** (KaveNegar integration, templates) | ✅ | ✅ | |
| 9 | **Notifications** (PWA push + 30s polling) | ✅ | ✅ | PWA background push deferred (needs VAPID + HTTPS deploy) |
| 10 | **Reports** (financial, activity) | ✅ | ✅ | Manager-only server component; period filter tabs; KPI cards; type breakdown; agent performance; recent contracts + activity log |
| 11 | **Settings** (office profile, billing, Zarinpal) | ✅ | ✅ | Manager-only. Office profile PATCH (name, phone, email, address, city). Zarinpal full flow: POST /api/payments/request → redirect → GET /api/payments/verify callback → subscription update. PaymentRecord model for idempotency. |
| 12 | **AI Description** (AvalAI + template fallback) | ✅ | ✅ | `POST /api/ai/description` (auth required). `lib/ai.ts`: `generateDescription()` calls AvalAI (`gpt-4o-mini`, 15s timeout, system+user roles, temperature per tone), always falls back to `buildDescriptionTemplate()`. Tone values: `formal`/`standard`/`compelling` (رسمی/معمولی/جذاب). |
| 13 | **Maps** (Neshan pin, POI, routing) | ✅ | ✅ | `lib/maps.ts`: `reverseGeocode`, `analyzeLocation`, `parseLocationAnalysis`. `GET /api/maps/reverse-geocode`. `POST /api/files/[id]/analyze-location`. `NeshanMapPicker` + `LocationPicker` (SSR-safe). `NeshanMapView` + `MapView` (SSR-safe). `LocationAnalysisDisplay`. FileForm: pin drop → reverse-geocode auto-fill → analyze-location after save. Detail page + public share page show map + analysis. |
| 14 | **Image Processing** (Sharp pipeline, watermark, storage) | ❌ | ❌ | |
| 15 | **Offline Drafts** (Dexie.js IndexedDB) | ❌ | ❌ | |
| 16 | **Subscription / Billing** (trial, grace, locked lifecycle) | ❌ | ❌ | |

### Test Files Written

| Test File | Feature | What It Covers |
|-----------|---------|---------------|
| `__tests__/validations/auth.test.ts` | Authentication | `registerSchema` (24 cases), `loginSchema` (5 cases), `forgotPasswordSchema` (2 cases) |
| `__tests__/actions/register.test.ts` | Authentication | `registerAction` — validation, duplicate checks, DB failure, happy path (9 cases) |
| `__tests__/lib/utils.test.ts` | Dashboard | `formatToman` (5 cases), `formatJalali` (3 cases) |
| `__tests__/actions/signout.test.ts` | Dashboard | `signOutAction` — calls `signOut({ redirectTo: "/login" })`, error propagation (2 cases) |
| `__tests__/dashboard/page.test.ts` | Dashboard | `trialDaysLeft` calculation (6 cases), `planLabels` (3 cases), `statusConfig` (4 cases) |
| `__tests__/validations/file.test.ts` | File Management | `contactSchema` (6 cases), `createFileSchema` (16 cases), `updateFileSchema` (5 cases), `changeFileStatusSchema` (4 cases) |
| `__tests__/api/files.test.ts` | File Management | `GET /api/files` (6 cases), `POST /api/files` (9 cases) |
| `__tests__/validations/customer.test.ts` | CRM | `createCustomerSchema` (15 cases), `updateCustomerSchema` (4 cases), `customerNoteSchema` (5 cases) |
| `__tests__/api/customers.test.ts` | CRM | `GET /api/crm` (5 cases), `POST /api/crm` (7 cases), `GET/PATCH/DELETE /api/crm/[id]` (9 cases), `GET/POST /api/crm/[id]/notes` (8 cases) |
| `__tests__/validations/agent.test.ts` | Agent Management | `createAgentSchema` (16 cases), `updateAgentSchema` (6 cases), `resetPasswordSchema` (5 cases) |
| `__tests__/api/agents.test.ts` | Agent Management | `GET /api/agents` (5 cases), `POST /api/agents` (6 cases), `GET/PATCH/DELETE /api/agents/[id]` (9 cases), `POST /api/agents/[id]/reset-password` (5 cases) |
| `__tests__/validations/contract.test.ts` | Contracts | `createContractSchema` (16 cases) |
| `__tests__/api/contracts.test.ts` | Contracts | `GET /api/contracts` (5 cases), `POST /api/contracts` (12 cases), `GET /api/contracts/[id]` (5 cases) |
| `__tests__/validations/shareLink.test.ts` | Share Links | `createShareLinkSchema` (7 cases) |
| `__tests__/api/share-links.test.ts` | Share Links | `GET /api/files/[id]/share-links` (5 cases), `POST /api/files/[id]/share-links` (8 cases), `PATCH /api/share-links/[id]` (5 cases) |
| `__tests__/validations/sms.test.ts` | SMS | `sendSmsSchema` — valid phone formats, invalid phones, message length (14 cases) |
| `__tests__/api/sms.test.ts` | SMS | `POST /api/sms/send` — auth, validation, KaveNegar error, happy path (8 cases) |
| `__tests__/api/notifications.test.ts` | Notifications | `GET /api/notifications` (4 cases), `PATCH /api/notifications/[id]` (3 cases), `PATCH /api/notifications/read-all` (2 cases) |
| `__tests__/reports/calculations.test.ts` | Reports | `getDateFilter` (7 cases), `normalisePeriod` (6 cases), `getTransactionTypeLabel` (4 cases), `getActivityActionLabel` (7 cases), `PERIOD_OPTIONS` (3 cases) |
| `__tests__/validations/settings.test.ts` | Settings | `updateOfficeProfileSchema` (12 cases), `requestPaymentSchema` (4 cases) |
| `__tests__/api/settings.test.ts` | Settings | `GET /api/settings` (5 cases), `PATCH /api/settings` (7 cases) |
| `__tests__/api/payments.test.ts` | Settings | `POST /api/payments/request` (6 cases), `GET /api/payments/verify` (7 cases) |
| `__tests__/lib/payment.test.ts` | Settings | `calculateNewPeriodEnd` (4 cases) |
| `__tests__/lib/ai.test.ts` | AI Description | `buildDescriptionTemplate` — transaction types, property types, location, physical details, amenities, tone differences, edge cases (24 cases) |
| `__tests__/api/ai-description.test.ts` | AI Description | `POST /api/ai/description` — auth, validation, happy path, AvalAI failure, fallback, all tone values (12 cases) |
| `__tests__/lib/maps.test.ts` | Maps | `parseLocationAnalysis` — null/undefined/non-object/array inputs, missing fields, valid POIs, invalid POI shape, invalid category, extra fields (13 cases) |
| `__tests__/api/maps.test.ts` | Maps | `GET /api/maps/reverse-geocode` — auth, missing params, NaN, out-of-range, happy path, null address (8 cases); `POST /api/files/[id]/analyze-location` — auth, 404, no lat, no lng, happy path, DB update, officeId filter (8 cases) |

### Current Status
- **Last completed:** Feature 13 — Maps (built + automated tests)
- **Up next:** Feature 14 — Image Processing (Sharp pipeline, watermark, storage)
- **Total tests:** 465 passing, 1 failing (pre-existing BigInt mismatch in share-links test)
