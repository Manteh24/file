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
- **Status:** Active development — all core features complete, preparing for production deployment

---

## 2. Tech Stack

| Layer | Technology | Notes |
|-------|-----------|-------|
| **Framework** | Next.js (App Router) | v14+, React 18, Server Components |
| **Language** | TypeScript (strict mode) | `.ts` / `.tsx` everywhere. No `.js` files. |
| **Styling** | Tailwind CSS v4 + shadcn/ui | v4: CSS-based config (`@theme` in `globals.css`), no `tailwind.config.ts`. shadcn components copied into `/components/ui/` |
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
│   ├── (admin)/                 # Admin panel — separate shell, SUPER_ADMIN + MID_ADMIN only
│   │   └── admin/
│   │       ├── layout.tsx       # Admin shell (sidebar, role guard)
│   │       ├── dashboard/       # Admin dashboard with KPI cards
│   │       ├── kpi/             # Detailed KPI groups
│   │       ├── offices/         # Office list + detail (soft delete, notes)
│   │       ├── subscriptions/   # Subscription management
│   │       ├── payments/        # Payment records
│   │       ├── users/           # User management (activate/deactivate)
│   │       ├── mid-admins/      # Mid-admin CRUD + tier + login history
│   │       ├── referrals/       # Referral program management
│   │       ├── ai-usage/        # AI usage stats
│   │       ├── broadcast/       # Platform-wide broadcasts
│   │       ├── settings/        # PlatformSetting editor (SUPER_ADMIN only)
│   │       └── audit-log/       # AdminActionLog viewer
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
│   ├── payment.ts               # Zarinpal request/verify + plan price constants
│   ├── admin.ts                 # Admin helpers (office filter, audit log, KPI calculators, tier capabilities)
│   ├── platform-settings.ts     # PlatformSetting DB cache + typed getters
│   ├── referral.ts              # Referral tracking helpers
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
├── scripts/
│   ├── seed-admin.ts            # Creates SUPER_ADMIN user. Run: npm run seed:admin
│   ├── env-validate.ts          # Validates all required env vars are set. Run: npm run env:validate
│   ├── health-check.ts          # Checks all 6 external services (DB, storage, AvalAI, KaveNegar, Neshan, Zarinpal). Run: npm run health
│   ├── db-audit.ts              # Audits DB for orphaned / inconsistent records. Run: npm run db:audit
│   ├── storage-audit.ts         # Cross-references storage bucket vs DB URLs; flags orphaned objects and broken references. Run: npm run storage:audit
│   ├── generate-report.ts       # Generates weekly operational snapshot (JSON + Markdown) to scripts/reports/. Run: npm run report:weekly
│   └── migrate-check.ts         # Pre-deploy gate: exits 1 if unapplied migrations exist. Run: npm run migrate:check
├── public/
│   ├── fonts/                   # Vazirmatn font files
│   ├── icons/                   # PWA icons (icon-192.png, icon-512.png) — must be created before production
│   └── manifest.json            # PWA manifest (lang:fa, dir:rtl, theme:#18181b)
├── .env.local                   # Git-ignored. Local secrets only.
├── .env.example                 # Committed. Shows all required env vars without values.
├── next.config.ts
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

### Mid-Admin Tiers (`AdminTier` enum)
Mid admins have a `adminTier` field controlling what write actions they can perform. Null tier = read-only.

| Tier | Capabilities |
|------|-------------|
| `SUPPORT` | `manageUsers` (activate/deactivate) + `securityActions` (force-logout, reset-password) + `broadcast` |
| `FINANCE` | `manageSubscriptions` (extend trial, change plan, suspend/reactivate) + `broadcast` |
| `FULL_ACCESS` | All capabilities — `manageSubscriptions` + `manageUsers` + `securityActions` + `broadcast` |

Helper: `canAdminDo(user, capability)` in `lib/admin.ts` — use this in every admin API route before any write.

---

## 7. Core Data Models (Summary)

### Key Entities
- **Office** — tenant root. Every other entity belongs to an office via `officeId`. Has `deletedAt DateTime?` for soft delete — all list/count queries must filter `deletedAt: null`.
- **User** — manager or agent. Belongs to one office. Has `role: MANAGER | AGENT`. Admin users have `officeId: null` and `role: SUPER_ADMIN | MID_ADMIN`.
- **File (فایل)** — property listing. Has `transactionType`, `status`, `officeId`, assigned agents.
- **ShareLink** — each share action creates one. Has `token` (unique), `customPrice`, `viewCount`, `fileId`.
- **Contract** — finalized deal. Linked to a file. Has commission fields, archive attachments.
- **Customer** — CRM contact. Belongs to office. Has `type`, notes, transaction history.
- **ActivityLog** — immutable log of all file changes. `userId`, `fileId`, `action`, `diff`, `timestamp`.
- **PriceHistory** — every price change on a file. `fileId`, `oldPrice`, `newPrice`, `changedAt`.
- **Notification** — per-user notification record. `userId`, `type`, `read`, `createdAt`.
- **Subscription** — one per office. `plan: FREE | PRO | TEAM`, `isTrial: boolean`, `billingCycle: MONTHLY | ANNUAL`, `status`, `trialEndsAt`, `currentPeriodEnd`.
- **PaymentRecord** — one per Zarinpal transaction. `authority`, `status: PENDING | VERIFIED | FAILED`, guards against double-verification.
- **AiUsageLog** — per-office per-Shamsi-month AI call counter. Used for plan limit enforcement.
- **SmsUsageLog** — per-office per-Shamsi-month SMS call counter (share SMS only). Used for FREE plan monthly cap enforcement. `@@unique([officeId, shamsiMonth])`.
- **AdminActionLog** — immutable audit log of all admin write actions. `adminId`, `action`, `targetId`, `metadata`.
- **OfficeNote** — admin-written notes about an office. `adminId`, `officeId`, `content`.
- **ReferralCode** — one per office. Used to track referrals at registration.
- **Referral** — links referrer office to referred office.
- **AdminBroadcast** — platform-wide messages sent to all offices by admin.
- **PlatformSetting** — key-value runtime config store. Keys: `MAINTENANCE_MODE`, `ZARINPAL_MODE`, `AVALAI_MODEL`, `FREE_MAX_USERS`, `FREE_MAX_FILES`, `FREE_MAX_AI_MONTH`.
- **AdminLoginLog** — records each admin login (userId, IP, userAgent, timestamp). Fire-and-forget in auth.ts.
- **AdminOfficeAssignment** — maps a MID_ADMIN user to specific offices they can access (static list).
- **AdminAccessRule** — dynamic access rule for a MID_ADMIN. Stores filters (`cities: String[]`, `plans: Plan[]`, `trialFilter: ANY | TRIAL_ONLY | PAID_ONLY`). Evaluated live in `getAccessibleOfficeIds` so newly-registered offices matching the filter are auto-accessible without re-assignment. Within one rule: city AND plan AND trial. Multiple rules are OR'd, and rule-matched offices are unioned with explicit `AdminOfficeAssignment` entries. Empty `cities[]` / `plans[]` = no constraint on that dimension.

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

**Quick-create UI:** `FileForm` in create mode shows only the 3 essential sections by default (Transaction Type, Location, Contacts). A dashed "تکمیل فایل" toggle button reveals the optional sections (Property Details, Price, Amenities, Description). Submit label is "ایجاد سریع فایل" when collapsed, "ایجاد فایل" when expanded. Edit mode always shows all sections.

### File Editing Model
- Single shared file. Last edit wins. No branching.
- Full activity log on every change (field-level diff).
- Price differences per customer are handled at **share link creation time**, not at file level.

### Share Links
- Each share action = new unique link with its own `customPrice` and `viewCount`.
- Links live at `view.[appname].ir/[token]` (separate domain).
- Link is valid only while file status is `ACTIVE`.
- When file is archived/closed → all its share links deactivate automatically.
- **`agentId` on a share link:** Managers may attribute any active office agent without that agent being pre-assigned to the file — the API verifies the agent belongs to the same office (`isActive: true`). Agents may only attribute themselves, and only when assigned to the file. Route: `POST /api/files/[id]/share-links`.

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
Register → 1-month full trial (isTrial=true, plan=FREE/PRO/TEAM)
→ 7 days before end: renewal reminders start
→ Trial/subscription expires → 7-day grace (full access + banner)
→ After grace: read-only lock
→ Data NEVER deleted automatically
```
Plans: `FREE` (limited users/files/AI), `PRO`, `TEAM`. Limits enforced at API level via `getEffectivePlanLimits(plan)` in `lib/subscription.ts` — reads runtime overrides from `PlatformSetting` DB table (cached 30s).

### Admin Panel — Platform Settings
Six runtime-configurable keys in `PlatformSetting` table (editable by SUPER_ADMIN only):
- `MAINTENANCE_MODE` — `"true"` redirects all non-admin traffic in middleware
- `ZARINPAL_MODE` — `"sandbox"` or `"production"`
- `AVALAI_MODEL` — overrides the AI model string (default `gpt-4o-mini`)
- `FREE_MAX_USERS`, `FREE_MAX_FILES`, `FREE_MAX_AI_MONTH`, `FREE_MAX_SMS_MONTH` — override FREE plan limits

Settings are cached for 30s in `lib/platform-settings.ts`. Call `clearSettingsCache()` in tests that exercise settings-reading code.

### Office Soft Delete
`Office.deletedAt` — set to `DateTime` on archive, `null` on restore. Not a hard delete.
- **All** `office.findMany` / `office.count` queries must include `where: { deletedAt: null }` unless intentionally showing deleted offices.
- Admin routes: `POST /api/admin/offices/[id]/archive` and `POST /api/admin/offices/[id]/restore`.
- `ArchiveRestoreButtons` component on office detail page (SUPER_ADMIN only).

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
- **Table headers:** always use `text-start` (not `text-end`) on `<th>`. In RTL, CSS logical `end` = left and `start` = right. Using `text-end` misaligns headers against left-defaulting cells.

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

### Pre-Deploy Checklist (production VPS)
```
npm run migrate:check        # exits 1 if unapplied migrations — run npx prisma migrate deploy first
npm run env:validate         # confirms all required env vars are set
npm run health               # checks all 6 external services are reachable
npx prisma migrate deploy    # apply pending migrations (if migrate:check reported any)
npm start                    # or pm2 restart
```

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
| Add Redux or any heavy state library | Use React Context + `useState`/`useEffect`/`fetch` |
| Use `useSWR` for data fetching | SWR is NOT installed — use `useState`/`useEffect`/`fetch` pattern |
| Skip loading/error/empty states | Always handle all three UI states |
| Write god functions (100+ lines) | Break into small, named, single-purpose functions |
| Use `any` in TypeScript | Use proper types or `unknown` |
| Display Gregorian dates to users | Always display Jalali |
| Display numbers without Toman formatting | Always use `formatToman()` utility |
| Forget to filter by `officeId` in DB queries | Multi-tenancy is enforced at query level |
| Process images client-side | All image processing is server-side (Sharp) |
| Use `text-end` on `<th>` in RTL tables | Use `text-start` — in RTL `end`=left, `start`=right |

---

## 18. Key Files Reference

Moved to **[`docs/file-reference.md`](docs/file-reference.md)** — look there for the full table of libraries, hooks, API routes, components, and scripts. Read it before hunting through the tree for a file that probably already exists.

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

## 21. Out of Scope (Do Not Build in v1)

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

## 22. Development Progress

> Workflow rule: build one feature at a time, write tests before moving to the next feature.

### Feature Build Order & Status

| # | Feature | Built | Tested |
|---|---------|-------|--------|
| 1 | Authentication (register, login, session, 2-session limit, middleware) | ✅ | ✅ |
| 2 | Dashboard (shell, sidebar, topbar, KPI cards) | ✅ | ✅ |
| 3 | File Management (create, edit, list, status lifecycle, activity log) | ✅ | ✅ |
| 4 | CRM (customers, contact history) | ✅ | ✅ |
| 5 | Agent Management (manager-only) | ✅ | ✅ |
| 6 | Contracts (finalization, commission, archive) | ✅ | ✅ |
| 7 | Share Links (public view page, token, custom price) | ✅ | ✅ |
| 8 | SMS (KaveNegar integration, templates) | ✅ | ✅ |
| 9 | Notifications (PWA push + 30s polling) | ✅ | ✅ |
| 10 | Reports (financial, activity — manager-only) | ✅ | ✅ |
| 11 | Settings (office profile, billing, Zarinpal full flow) | ✅ | ✅ |
| 12 | AI Description (AvalAI + template fallback) | ✅ | ✅ |
| 13 | Maps (Neshan pin, POI, routing) | ✅ | ✅ |
| 14 | Image Processing (Sharp pipeline, watermark, storage) | ✅ | ✅ |
| 15 | Offline Drafts (Dexie.js IndexedDB) | ✅ | ✅ |
| 16 | Subscription / Billing (trial, grace, locked lifecycle) | ✅ | ✅ |
| — | File List Filters enhancement | ✅ | ✅ |
| — | Subscription Tier Redesign (FREE/PRO/TEAM) | ✅ | ✅ |
| — | Admin Panel Phase 1 (KPI, subscriptions, payments, audit log) | ✅ | ✅ |
| — | Admin Panel Phase 2 (referrals, users enhanced, AI usage, broadcast, settings) | ✅ | ✅ |
| — | Mid-Admin Permission Tiers (SUPPORT / FINANCE / FULL_ACCESS / read-only) | ✅ | ✅ |
| — | Admin Panel Phase 3 (office soft delete, settings editor, login history) | ✅ | ✅ |
| — | Support Ticketing (thread-based tickets, admin reply, notifications, attachments) | ✅ | ✅ |
| — | Configurable default referral commission (`DEFAULT_REFERRAL_COMMISSION` PlatformSetting, propagates to auto-generated office codes, live in manager referral panel) | ✅ | ✅ |
| — | City selection (Iranian cities dropdown on registration + office profile; city filter on admin offices, users, broadcast, support pages) | ✅ | ✅ |
| — | Jalali calendar for admin payments date range filter (replaces native Gregorian `<input type="date">`) | ✅ | ✅ |
| — | Subscription Tier Enforcement Refinement (SMS split gate, map enrichment gate, SmsUsageLog, usePlanStatus hook, TrialFeatureWarning, PlanUsageSummary, pre-flight UI limit checks) | ✅ | ✅ |
| — | Dashboard UX polish (profile page, guide page, sidebar RTL arrows, dark-mode banners) | ✅ | — |
| — | CRM redesign (multi-type Customer, CustomerPicker in ContractForm, ContractCustomer join table, share-to-agent notification) | ✅ | — |
| — | Message Center (manager-only: notify agents, bulk SMS to customers [TEAM-only], history log — email tab removed) | ✅ | — |
| — | Dashboard expiring contracts widget (LONG_TERM_RENT leases expiring within 60 days, color-coded days remaining) | ✅ | — |
| — | Email infrastructure (lib/email.ts, Nodemailer SMTP, broadcast/welcome/trial-reminder templates) | ✅ | — |
| — | Bug fixes + FileForm quick-create redesign (share link manager agentId fix, topbar UserCircle avatar, sidebar TEAM label, dark-mode popover hover, FileForm collapse/expand) | ✅ | — |
| — | Admin dynamic access rules (`AdminAccessRule` model: city + plan + trial filters, live-evaluated in `getAccessibleOfficeIds`, union with explicit assignments, UI in create + edit mid-admin flows) | ✅ | — |
| — | Calendar reminder firing (`CalendarEvent.reminderFiredAt` + `/api/cron/fire-calendar-reminders` per-minute cron; notification types `CALENDAR_REMINDER_SOUND` / `CALENDAR_REMINDER_SILENT`; client plays a Web-Audio "ding" via `lib/reminder-sound.ts`; notification badge legibility fix — `bg-rose-500 text-white ring-2 ring-background` since `--destructive-foreground` isn't defined) | ✅ | — |
| — | Support ticket submit toast — local auto-fading success pill on `/support/new` (fixed top-center, `animate-in fade-in-0 slide-in-from-top-2`, dark-mode variant); submit stays disabled during a 1.4s delay before redirect to the ticket detail page, so the user sees confirmation that «تیکت با موفقیت ارسال شد» | ✅ | — |
| — | TEAM-tier Phase B — branch enablement (Office `multiBranchEnabled` + two cross-branch share toggles; `Branch.isHeadquarters` + unique `managerId`; PropertyFile/Customer `branchId`; `lib/branch-scope.ts` with 20 unit tests; routes: `POST /api/branches/enable` stamps HQ + back-fills agents/files/customers, `GET/POST /api/branches`, `PATCH/DELETE /api/branches/[id]` with HQ-protection) | ✅ | ✅ |
| — | TEAM-tier Phase C — capability gate refactor (swap `session.user.role !== "MANAGER"` → `canOfficeDo(user, capability)` across API routes, dashboard page redirects, and server-component UI gates; preserves legacy `canFinalizeContracts` DB fallback on contract-finalization paths until the override migration) | ✅ | ✅ |
| — | TEAM-tier Phase D — UI: capability-aware sidebar/mobile nav (replaces `managerOnly` with `requiresCapability?: OfficeCapability`); Settings → Team & Branches tab (enable multi-branch CTA, branch CRUD dialog, two cross-branch sharing toggles); Branch switcher band in shell (URL `?branchId=`); Staff form extension (preset role dropdown, branch selector, collapsible PermissionMatrix override panel); new endpoint `PATCH /api/branches/settings` | ✅ | ✅ |
| — | TEAM-tier Phase E — branch query param wiring + plan-flag gates: `?branchId` from BranchSwitcher now reaches server queries on `/files`, `/crm`, and `/dashboard` (KPI cards + status ring) via new `resolveBranchScope(user, office, entity, requestedBranchId)` helper in `lib/branch-scope.ts`; `POST /api/branches/enable` now gated by `PLAN_FEATURES[sub.plan].hasMultiBranch`; new `hasCustomStaffRoles` flag (TEAM-only) gates AgentForm staff-role dropdown | ✅ | ✅ |
| — | TEAM-tier bugfixes — (1) AgentForm save was silently failing in edit mode because `createAgentSchema` (with `password.min(8)`) was the resolver in both create and edit; switched edit mode to `updateAgentSchema` so the hidden empty password no longer blocks submission. (2) `DeactivateAgentButton` now takes `multiBranchEnabled` and swaps the noun between «مشاور» and «کاربر» (title, button label, confirmation copy) so non-agent staff roles aren't mislabeled; agent detail page fetches `office.multiBranchEnabled` and forwards it. | ✅ | ✅ |
| — | UX Cluster C — Global Toast/Feedback System (sonner ~5KB, RTL-safe via `dir="rtl"`, dark-mode-syncing via MutationObserver on `<html>` class). New: `components/ui/sonner.tsx` Toaster wrapper (`position="top-center"`, `richColors`, `closeButton`); `lib/toast.ts` thin API (`toastSuccess` 2.5s / `toastError` 4s / `toastInfo` 3s / `toastPromise`); `<Toaster />` mounted once in `app/layout.tsx`. 8 Tier-1 mutation surfaces wired: `FileForm` create/edit, `ShareLinksPanel` create/deactivate, `SmsPanel` send (replaced inline `result` state with toasts), `ArchiveFileButton`, admin `ArchiveRestoreButtons`, `SuspendReactivateButtons`, `SubscriptionManager` save (replaced local `setSaved` pill with toast + added `router.refresh()`). All surfaces import from `@/lib/toast`, never directly from `sonner`. Existing in-context copy-icon swaps in `ShareLinksPanel` and `ReferralDashboard` left untouched. | ✅ | — |
| — | UX Cluster C Phase 3 — Tier-2 + Tier-3 toast rollout. Tier-2 (manager writes): `AgentForm` create/edit, `CustomerForm` create/edit, `ContractForm` submit, `OfficeProfileForm` save + logo upload (removed `saved` state + 3s timer effect), `UserProfileForm` save + avatar upload (removed inline error/success Alerts; kept Check-icon button state), `TeamBranchesSection` enable/save/delete + cross-branch sharing toggles, `ReferralDashboard` bank-details save (removed `saveMsg` pill). Tier-3 (admin writes): broadcast send (count goes into the toast — replaced result/error pills), `AdminSettingsForm` saveSection (removed top-level error banner + per-section savedSection pills via sed), `MidAdminForm` (CreateMidAdminForm/EditProfileForm/EditTierForm/EditAssignmentsForm/EditAccessRulesForm — removed all `saved` ✓ pills; kept inline `error` only for rule-empty validation), `OfficeNotesPanel` add (removed `submitError` pill). All surfaces import from `@/lib/toast`. | ✅ | ✅ |
| — | UX Cluster D Phase 1 — Replace `window.confirm()` with shadcn `AlertDialog`. Four callsites converted: `components/files/ArchiveFileButton.tsx` (uses `<AlertDialogTrigger asChild>` pattern), `components/admin/SuspendReactivateButtons.tsx` (single shared dialog driven by `pending: "suspend" \| "reactivate" \| null` state — copy swaps based on `pending`), `components/admin/ArchiveRestoreButtons.tsx` (archive needs confirmation, restore is reversible and fires immediately), `components/contracts/ContractSmsActions.tsx` (cancel-schedule trash button now opens AlertDialog). All RTL-correct, dark-mode-aware, theme-consistent. | ✅ | ✅ |

### Current Status
- **Last completed:** UX Cluster C Phase 3 + Cluster D Phase 1. **Cluster C Phase 3** wired toasts into all Tier-2 manager-write surfaces (AgentForm, CustomerForm, ContractForm, OfficeProfileForm, UserProfileForm, TeamBranchesSection, ReferralDashboard) and all Tier-3 admin non-destructive writes (broadcast send, AdminSettingsForm, MidAdminForm × 5 sub-forms, OfficeNotesPanel). All inline saved/error pills with redundant data were stripped (kept only contextual inline errors that point at specific form fields, e.g., MidAdminForm's rule-empty validation). **Cluster D Phase 1** replaced all four `window.confirm()` callsites — `ArchiveFileButton`, `SuspendReactivateButtons`, `ArchiveRestoreButtons`, `ContractSmsActions` cancel-schedule — with shadcn `AlertDialog`. The audit's #1 (🔴) and #3 (🟠) findings are now resolved; `docs/ux-audit.md` updated to reflect this.

- **Previously completed:** UX Cluster C Phase 2 — global toast feedback foundation. Audit's #1 finding (🔴 Blocker) was that ~40 mutation surfaces called `router.refresh()` silently. Foundation: `sonner` (~5KB) + `components/ui/sonner.tsx` (theme-syncing via MutationObserver on `<html>` class) + `lib/toast.ts` API + Toaster mounted at root. Phase 2 wired 8 Tier-1 surfaces (`FileForm`, `ShareLinksPanel` create/deactivate, `SmsPanel`, `ArchiveFileButton`, admin `ArchiveRestoreButtons` / `SuspendReactivateButtons` / `SubscriptionManager`). `SmsPanel`'s inline `result` state and `SubscriptionManager`'s `setSaved` pill removed in favor of toasts. Existing copy-icon swap pattern in `ShareLinksPanel`/`ReferralDashboard` intentionally left alone (in-context micro-confirmations).

- **Previously completed:** TEAM-tier bugfixes — fixed silent submit failure on `AgentForm` edit (used `updateAgentSchema` as resolver in edit mode so the hidden empty `password` field no longer fails the `min(8)` rule), and made `DeactivateAgentButton` swap «مشاور» → «کاربر» across the title, button, and confirmation when multi-branch is enabled (agent detail page now reads `office.multiBranchEnabled` and passes it through). Both fixes live in `components/agents/AgentForm.tsx`, `components/agents/DeactivateAgentButton.tsx`, and `app/(dashboard)/agents/[id]/page.tsx`. Agent test suite (31 tests) still green.

- **Previously completed:** TEAM-tier Phase E (branch query param + plan flag gates). New helper `resolveBranchScope(user, office, entity, requestedBranchId)` in `lib/branch-scope.ts` overlays `buildBranchFilter`'s visibility filter with the `?branchId` from the BranchSwitcher: branch-scoped users can never widen scope (visibility wins), but MANAGER / `viewAllBranches` users can narrow to one branch via the switcher. Wired into `app/(dashboard)/files/page.tsx` (file list), `app/(dashboard)/crm/page.tsx` (customer list), and `app/(dashboard)/dashboard/page.tsx` (active files count, customer count, file status groupBy — contracts/team count stay office-wide since they have no branchId). Each page fetches `office.{multiBranchEnabled, shareFilesAcrossBranches, shareCustomersAcrossBranches}` and merges the resulting `{ branchId? }` fragment into the existing `where` clause. `POST /api/branches/enable` now uses `PLAN_FEATURES[sub.plan].hasMultiBranch` instead of an inline `sub.plan !== "TEAM"` check (semantically identical today, but follows the plan-feature-flag pattern). New `hasCustomStaffRoles: boolean` flag added to `PLAN_FEATURES` (`true` for TEAM, `false` for FREE/PRO); `AgentForm` swapped from `plan === "TEAM"` to `PLAN_FEATURES[plan].hasCustomStaffRoles` for the staff role dropdown gate.

- **Previously completed:** TEAM-tier Phase D (UI). New components: `components/dashboard/BranchSwitcher.tsx` (URL `?branchId=` sync, hidden when ≤1 branch), `components/settings/TeamBranchesSection.tsx` (enable card + branch list + sharing toggles, gated to TEAM via inline plan check), `components/settings/PermissionMatrix.tsx` (collapsible override panel; toggling back to preset removes the override key). New endpoint: `PATCH /api/branches/settings` for the two cross-branch sharing flags. `DashboardShell` now takes `sessionUser: { role, officeMemberRole, permissionsOverride }` instead of `role`, plus a `multiBranchEnabled` flag fed from the layout. `Sidebar`/`MobileBottomNav`/`MobileMoreSheet`/`QuickCreateSheet`/`SearchDialog` all switched from `managerOnly: boolean` to `requiresCapability?: OfficeCapability` and resolve gates via `canOfficeDo(sessionUser, ...)`. `lib/validations/agent.ts`: `createAgentSchema`/`updateAgentSchema` extended with `officeMemberRole`, `permissionsOverride` (sparse Record), `branchId`. `app/api/agents/route.ts` POST persists the new fields; `app/api/agents/[id]/route.ts` PATCH writes branch via `branch.connect/disconnect` and serializes override via `Prisma.JsonNull`. `AgentForm` shows the staff-role dropdown + permission matrix on TEAM, and the branch dropdown when multi-branch is enabled — feeds both into the request body. **Intentionally left alone:** `Topbar`/`SubscriptionBanner`/`ShareLinksPanel`/`DayEventsPanel` keep `role` as prop (their remaining `role === "MANAGER"` checks are semantic role identity rather than office capabilities; calendar rules preserved per plan).
- **Up next:** With Cluster C and Cluster D Phase 1 done, the highest-impact remaining UX clusters are **Cluster B (Activation: first-run dashboard CTA + onboarding checklist)** and **Cluster E (File-form polish: phone tolerance, photo upload progress, mobile collapse-toggle visibility, AI description overwrite warning, draft-saved indicator placement)**. Cluster B targets audit findings #4, #6, #8 and aligns with the activation drop-off in §2.2 of the UX audit. Cluster E targets §5 file-form findings F-3a.4/6/11/15/16. **Cluster D Phase 2** (type-to-confirm pattern for high-risk destructive actions like office archive, force-logout-all, delete-data) is also outstanding but lower priority. Still outstanding from prior iterations: TEAM-tier multi-branch manual smoke tests, calendar-reminder cron entry on VPS (`* * * * * curl -s -X POST -H "x-cron-secret: $CRON_SECRET" http://localhost:3000/api/cron/fire-calendar-reminders`), and manual test of the calendar ding + ticket toast together. Deferred to v2: per-branch billing, cross-branch file/customer transfer, multi-branch-per-user, branch-level activity log dashboards, geography-based lead routing.
- **Total tests:** 747 passing, 0 failing (50 test files). Typecheck: 24 pre-existing errors (all in `__tests__/` or `components/files/FileMapView.tsx` — zero new errors introduced by Cluster C).
- **Dev note:** If `/admin/dashboard` returns 404 after network interruptions during dev, delete `.next/` and restart — Next.js route cache can corrupt mid-write

### Reference Docs
- **Test registry:** `docs/test-registry.md` — full list of test files and what they cover
- **Roadmap:** `docs/roadmap.md` — future plans

---

## 23. Security

Pre-deployment hardening pass completed (2026-03-10).

| Control | Implementation |
|---------|---------------|
| **Security headers** | Configured in `next.config.ts`: CSP (enforced in prod, report-only in dev), X-Frame-Options, X-Content-Type-Options, X-XSS-Protection, Referrer-Policy, Permissions-Policy, HSTS (prod only). CSP allowlists: avalai.ir, kavenegar.com, zarinpal.com, *.neshan.org, IranServer storage origin. |
| **HTTPS redirect** | `next.config.ts` redirects HTTP → HTTPS via `x-forwarded-proto` header check. Production only — no effect on `localhost`. |
| **Session invalidation** | Middleware performs a DB `isActive` check on every authenticated request. Deactivated/force-logged-out users are rejected immediately without waiting for JWT expiry. API routes get 401 JSON; page routes get redirect to `/login`. |
| **Rate limiting** | In-memory fixed-window limiter (`lib/rate-limit.ts`). Login: 10 attempts / 15 min / IP. SMS send: 10 / min / office. Skipped entirely in development. Single-VPS only — not suitable for multi-instance. |
| **Cron protection** | `/api/cron/lock-expired-trials` rejects any request whose `x-forwarded-for` header is not empty or a loopback address. VPS cron must call `http://localhost:3000/...`, not the public domain. Secret header kept as defense-in-depth. |
| **Password reset** | SMS OTP via KaveNegar. `User.phone` (nullable unique) + `PasswordResetToken` model (SHA-256 hash, 5min TTL, single-use). `POST /api/auth/password-reset/request` (3 OTPs/10min per phone) + `POST /api/auth/password-reset/complete` (5 attempts/15min, wipes all UserSessions). 3-screen forgot-password page. Phone settable in Settings → پروفایل کاربری. |
