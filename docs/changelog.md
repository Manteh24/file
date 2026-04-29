# Development Progress / Changelog

> Workflow rule: build one feature at a time, write tests before moving to the next feature.

## Feature Build Order & Status

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
| — | Calendar reminder firing (`CalendarEvent.reminderFiredAt` + `/api/cron/fire-calendar-reminders` per-minute cron; notification types `CALENDAR_REMINDER_SOUND` / `CALENDAR_REMINDER_SILENT`; client plays a Web-Audio "ding" via `lib/reminder-sound.ts`; notification badge legibility fix) | ✅ | — |
| — | Support ticket submit toast — local auto-fading success pill on `/support/new` | ✅ | — |
| — | TEAM-tier Phase B — branch enablement (Office `multiBranchEnabled` + cross-branch share toggles; `Branch.isHeadquarters` + unique `managerId`; PropertyFile/Customer `branchId`; `lib/branch-scope.ts` with 20 unit tests; routes: `POST /api/branches/enable`, `GET/POST /api/branches`, `PATCH/DELETE /api/branches/[id]`) | ✅ | ✅ |
| — | TEAM-tier Phase C — capability gate refactor (swap `session.user.role !== "MANAGER"` → `canOfficeDo(user, capability)`) | ✅ | ✅ |
| — | TEAM-tier Phase D — UI: capability-aware sidebar/mobile nav; Settings → Team & Branches tab; Branch switcher band; Staff form with preset role dropdown + branch selector + PermissionMatrix override; new endpoint `PATCH /api/branches/settings` | ✅ | ✅ |
| — | TEAM-tier Phase E — branch query param wiring + plan-flag gates: `?branchId` reaches server queries via `resolveBranchScope`; `POST /api/branches/enable` gated by `PLAN_FEATURES[sub.plan].hasMultiBranch`; new `hasCustomStaffRoles` flag (TEAM-only) | ✅ | ✅ |
| — | TEAM-tier bugfixes — AgentForm edit submit (used `updateAgentSchema` resolver); `DeactivateAgentButton` swaps «مشاور»/«کاربر» when multi-branch enabled | ✅ | ✅ |
| — | UX Cluster C — Global Toast/Feedback System (sonner ~5KB, RTL-safe, dark-mode-syncing). `components/ui/sonner.tsx` Toaster, `lib/toast.ts` API (`toastSuccess/Error/Info/Promise`), 8 Tier-1 surfaces wired | ✅ | — |
| — | UX Cluster C Phase 3 — Tier-2 + Tier-3 toast rollout. All manager-write surfaces (AgentForm, CustomerForm, ContractForm, OfficeProfileForm, UserProfileForm, TeamBranchesSection, ReferralDashboard) and admin non-destructive writes (broadcast, AdminSettingsForm, MidAdminForm × 5, OfficeNotesPanel) | ✅ | ✅ |
| — | UX Cluster D Phase 1 — Replace `window.confirm()` with shadcn `AlertDialog` (4 callsites: ArchiveFileButton, SuspendReactivateButtons, ArchiveRestoreButtons, ContractSmsActions cancel-schedule) | ✅ | ✅ |
| — | UX Cluster B — Activation polish (audit #4/#6/#8 + F-2.3/F-2.5). New `FirstRunChecklist`, `dashboard/page.tsx` extended counts, `PhotoGallery` XHR upload progress, `FileForm` chip-row hint + sticky pill, `SubscriptionBanner` near-expiry copy reframed | ✅ | — |
| — | UX Cluster A — Conversion (F-1.6 hero JTBD reframe → "وقتی مشتری زنگ زد، یک لینک حرفه‌ای برایش بفرست", F-1.11 register 2-step split, live-pulse trust strip replacing F-1.28, dark-mode `--color-text-tertiary` token bump for AA). New `app/api/public/pulse/route.ts`, `components/marketing/LivePulseStrip.tsx`, `__tests__/api/public-pulse.test.ts` (5 tests). RegisterForm split into Account → Office steps, single RHF instance, `form.trigger()` gating | ✅ | ✅ |

## Current Status (as of 2026-04-29)

- **Last completed:** UX Cluster A — Conversion. F-1.6 hero JTBD reframe (headline → «وقتی مشتری زنگ زد، یک لینک حرفه‌ای برایش بفرست»; sub → «فایل را ثبت کن، عکس و توضیحات را آماده کن، با یک تپ بفرست — همه‌اش از همان گوشی.»), F-1.11 register split (single RHF instance, step 1 = account credentials with `form.trigger()` gate, step 2 = office details with «بازگشت»), unique live-pulse trust strip replacing F-1.28 (real anonymized aggregates from `office.count` / `shareLink.count` / distinct cities; privacy gates: hide if `activeOffices < 5`, suppress city chips if `cities < 10`), and dark-mode `--color-text-tertiary` AA bump (`#78716C` → `#94908A`). Files touched: `components/marketing/HeroSection.tsx`, `app/(auth)/register/RegisterForm.tsx`, `app/api/public/pulse/route.ts` (new), `components/marketing/LivePulseStrip.tsx` (new), `app/page.tsx`, `app/globals.css`, `__tests__/api/public-pulse.test.ts` (new, 5 tests). Tests: 752/752 passing (51 files).

- **Up next:** **Cluster E (File-form polish: F-3a.4 phone tolerance, F-3a.11 main-contact validation timing, F-3a.15 SMS preview, F-3a.16 SMS silent success)** and **Cluster D Phase 2 (type-to-confirm for office archive, force-logout-all, delete-data)**. Outstanding manual: Cluster A — register 2-step mobile (375px) walkthrough, `/api/public/pulse` curl smoke + landing visual at varying offices/cities counts, dark-mode AA spot-check on Sidebar account popover; TEAM-tier multi-branch smoke tests; calendar-reminder cron entry on VPS (`* * * * * curl -s -X POST -H "x-cron-secret: $CRON_SECRET" http://localhost:3000/api/cron/fire-calendar-reminders`); calendar ding + ticket toast manual test; Cluster B mobile + slow-3G photo-upload smoke. Deferred to v2: per-branch billing, cross-branch file/customer transfer, multi-branch-per-user, branch-level activity log dashboards, geography-based lead routing.

- **Total tests:** 752 passing, 0 failing (51 test files). Typecheck: 24 pre-existing errors (all in `__tests__/` or `components/files/FileMapView.tsx`).

- **Dev note:** If `/admin/dashboard` returns 404 after network interruptions during dev, delete `.next/` and restart — Next.js route cache can corrupt mid-write.

## Reference Docs
- **Test registry:** `docs/test-registry.md` — full list of test files and what they cover
- **Roadmap:** `docs/roadmap.md` — future plans
- **UX audit:** `docs/ux-audit.md` — findings backlog driving the UX clusters
