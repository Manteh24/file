# Key Files Reference

Reference for the most-edited / most-important files in the codebase. Extracted from CLAUDE.md Section 18 to keep the root context file under the size-warning threshold.

## Core libraries (`lib/`)

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
| `lib/file-helpers.ts` | `logActivity`, `recordPriceChanges`, `buildDiff`, `deactivateShareLinks`, `buildFileWhere`, `buildOrderBy` — shared file query builders used by both the server page and the API route |
| `lib/subscription.ts` | `resolveSubscription`, `getEffectiveSubscription` (lazy status migration), `requireWriteAccess`, `SubscriptionLockedError`, `getEffectivePlanLimits(plan)` (reads PlatformSetting overrides), `PLAN_LIMITS`, `PLAN_FEATURES`, `getSmsUsageThisMonth(officeId)`, `incrementSmsUsage(officeId)`, `getAiUsageThisMonth(officeId)`, `incrementAiUsage(officeId)` |
| `lib/admin.ts` | `getAccessibleOfficeIds`, `buildOfficeFilter`, `logAdminAction`, `calculateMrr`, `calculateChurnRate`, `calculateTrialConversionRate`, `calculateAiCostThisMonth`, `calculateReferralKpis`, `AI_UNIT_COST_TOMAN`, `TIER_CAPABILITIES`, `canAdminDo(user, capability)`, `TIER_LABELS` |
| `lib/payment.ts` | `PLAN_PRICES_TOMAN`, `PLAN_PRICES_RIALS`, `PLAN_LABELS`, `requestPayment()`, `verifyPayment()`, `calculateNewPeriodEnd()` |
| `lib/cities.ts` | Static list of 62 major Iranian cities — imported by city `<select>` dropdowns in registration, office settings, and admin filters |
| `lib/platform-settings.ts` | `getSetting(key)`, typed getters (`getMaintenanceMode`, `getZarinpalMode`, `getAvalaiModel`, `getFreePlanLimits`, `getDefaultReferralCommission`), `clearSettingsCache()` — 30s module-level cache |
| `lib/referral.ts` | Referral tracking helpers, auto-code generation on register |
| `lib/email.ts` | Nodemailer SMTP email sending — `sendEmail()` (never throws), `buildBroadcastEmail()`, `buildWelcomeEmail()`, `buildTrialReminderEmail()`. Requires `npm install nodemailer` on first deploy. Uses dynamic `require` to compile without package present. |

## Hooks

| File | Purpose |
|------|---------|
| `hooks/useDraft.ts` | Dexie.js IndexedDB draft management for file creation |
| `hooks/usePlanStatus.ts` | Client hook — polls `/api/subscription/usage` every 30s; exposes `isNearLimit(field)` (≥70%) and `isAtLimit(field)` helpers. Fields: `activeFiles`, `users`, `ai`, `sms`. Max=-1 means unlimited. |

## API routes

| File | Purpose |
|------|---------|
| `app/api/subscription/usage/route.ts` | GET — manager-only; returns plan, isTrial, trialEndsAt, and usage counts with maxes (Infinity serialized as -1). |
| `app/api/admin/system-status/route.ts` | SUPER_ADMIN-only live system status: 5 parallel service checks (DB, storage, AvalAI, KaveNegar, Neshan) with 5 s timeouts + DB stats (active offices, subscription breakdown, stuck payments, last admin action) + live platform settings. Always returns 200 per-service; returns 500 only if DB is unreachable. |
| `app/api/crm/[id]/contracts/route.ts` | GET — returns ContractCustomer records for a CRM customer (contract type, file address, finalized date, lease end date) |
| `app/api/crm/[id]/share-links/route.ts` | GET — returns ShareLink records linked to a CRM customer |
| `app/api/crm/[id]/share-to-agent/route.ts` | POST `{ agentId }` — creates CUSTOMER_SHARED notification for an agent |
| `app/api/dashboard/expiring-contracts/route.ts` | GET `?days=60` — LONG_TERM_RENT contracts whose lease end is within N days. Manager: all office; Agent: own files only. |
| `app/api/messages/route.ts` | GET — OfficeMessage history (manager-only) |
| `app/api/messages/notify-agents/route.ts` | POST — send in-app notification to all/selected agents; saves OfficeMessage |
| `app/api/messages/sms-customers/route.ts` | POST — bulk SMS to filtered CRM customers; **TEAM plan only**; saves OfficeMessage |
| `app/api/messages/email-customers/route.ts` | POST — bulk email to filtered CRM customers via SMTP; saves OfficeMessage (email tab removed from UI) |
| `app/api/files/[id]/contacts-with-crm-match/route.ts` | GET — returns file contacts cross-referenced against CRM customers by phone |

## Components

| File | Purpose |
|------|---------|
| `components/shared/TrialFeatureWarning.tsx` | Chip shown on PRO-only features when subscription is trial; amber >7 days left, red ≤7 days. Props: `feature` (keyof PLAN_FEATURES.PRO) + `subscription`. |
| `components/dashboard/PlanUsageSummary.tsx` | FREE-plan usage bars (activeFiles, users, AI, SMS). Only renders when plan=FREE. Color-coded: <70% primary, 70–99% amber, 100% red. |
| `components/dashboard/ExpiringContractsWidget.tsx` | Dashboard card: LONG_TERM_RENT contracts expiring soon (color-coded) |
| `components/crm/CustomerTypeSelector.tsx` | Checkbox pill group for multi-type CRM customer selection |
| `components/crm/CustomerContractsSection.tsx` | Customer detail section: contracts linked via ContractCustomer, with lease days-remaining chip |
| `components/crm/CustomerShareLinksSection.tsx` | Customer detail section: share links where customer is linked |
| `components/crm/ShareCustomerButton.tsx` | Dropdown to share a CRM customer to an agent (creates notification) |
| `components/crm/CustomerSmsButton.tsx` | Button + Dialog popup to send SMS to a CRM customer (appears in customer detail page header actions) |
| `components/contracts/CustomerPicker.tsx` | Step in ContractForm: auto-suggests CRM customers from file contacts, allows inline new customer creation |
| `components/messages/AgentMessageForm.tsx` | In-app notification form for manager → agents |
| `components/messages/CustomerSmsForm.tsx` | Bulk SMS form: message + customer type filter |
| `components/messages/CustomerEmailForm.tsx` | Bulk email form: subject + body + customer type filter |
| `components/messages/MessageHistoryList.tsx` | OfficeMessage history list with channel icon + filter label |

## Scripts

| File | Purpose |
|------|---------|
| `scripts/storage-audit.ts` | Bucket vs DB cross-reference: surfaces orphaned storage objects and broken DB URLs. Writes timestamped JSON report to `scripts/reports/`. |
| `scripts/generate-report.ts` | Weekly operational snapshot: queries all key metrics and writes JSON + Markdown to `scripts/reports/`. Uses Jalali date arithmetic to derive grace/locked counts fresh (not from cached status column). |
| `scripts/migrate-check.ts` | Pre-deploy migration gate — **run this first in every deploy**. Exits 0 if schema is up to date, exits 1 with migration names if not. |

## Top-level / other

| File | Purpose |
|------|---------|
| `prisma/schema.prisma` | Database schema — source of truth for all models |
| `types/index.ts` | Shared TypeScript types and interfaces |
| `prd.md` | Full Product Requirements Document |
| `generalideas.md` | Original product brainstorm and ideation notes |
