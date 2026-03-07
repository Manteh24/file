# Test Registry

> Full list of automated test files. Updated after each feature + test cycle.
> **Total:** 656 passing, 0 failing (46 test files)

## Test Files

| Test File | Feature | What It Covers |
|-----------|---------|---------------|
| `__tests__/validations/auth.test.ts` | Authentication | `registerSchema` (24 cases), `loginSchema` (5 cases), `forgotPasswordSchema` (2 cases) |
| `__tests__/actions/register.test.ts` | Authentication | `registerAction` — validation, duplicate checks, DB failure, happy path (9 cases) |
| `__tests__/lib/utils.test.ts` | Dashboard | `formatToman` (5 cases), `formatJalali` (3 cases) |
| `__tests__/actions/signout.test.ts` | Dashboard | `signOutAction` — calls `signOut({ redirectTo: "/login" })`, error propagation (2 cases) |
| `__tests__/dashboard/page.test.ts` | Dashboard | `trialDaysLeft` calculation (6 cases), `planLabels` (3 cases), `statusConfig` (4 cases) |
| `__tests__/validations/file.test.ts` | File Management | `contactSchema` (6 cases), `createFileSchema` (16 cases), `updateFileSchema` (5 cases), `changeFileStatusSchema` (4 cases) |
| `__tests__/api/files.test.ts` | File Management + Redesign | `GET /api/files` (6 cases), `POST /api/files` (9 cases); FREE plan active file count limit enforcement (1 case) (16 total) |
| `__tests__/validations/customer.test.ts` | CRM | `createCustomerSchema` (15 cases), `updateCustomerSchema` (4 cases), `customerNoteSchema` (5 cases) |
| `__tests__/api/customers.test.ts` | CRM | `GET /api/crm` (5 cases), `POST /api/crm` (7 cases), `GET/PATCH/DELETE /api/crm/[id]` (9 cases), `GET/POST /api/crm/[id]/notes` (8 cases) |
| `__tests__/validations/agent.test.ts` | Agent Management | `createAgentSchema` (16 cases), `updateAgentSchema` (6 cases), `resetPasswordSchema` (5 cases) |
| `__tests__/api/agents.test.ts` | Agent Management + Redesign | `GET /api/agents` (5 cases), `POST /api/agents` (6 cases), `GET/PATCH/DELETE /api/agents/[id]` (9 cases), `POST /api/agents/[id]/reset-password` (5 cases); FREE/PRO user count limit enforcement (2 cases) (29 total) |
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
| `__tests__/api/ai-description.test.ts` | AI Description + Redesign | `POST /api/ai/description` — auth, validation, happy path, AvalAI failure, fallback, all tone values (12 cases); FREE plan AI limit enforcement, incrementAiUsage called, PRO skips count check (4 cases) (16 total) |
| `__tests__/lib/maps.test.ts` | Maps | `parseLocationAnalysis` — null/undefined/non-object/array inputs, missing fields, valid POIs, invalid POI shape, invalid category, extra fields (13 cases) |
| `__tests__/api/maps.test.ts` | Maps | `GET /api/maps/reverse-geocode` — auth, missing params, NaN, out-of-range, happy path, null address (8 cases); `POST /api/files/[id]/analyze-location` — auth, 404, no lat, no lng, happy path, DB update, officeId filter (8 cases) |
| `__tests__/lib/image.test.ts` | Image Processing | `processPropertyPhoto` — rotate, resize params, JPEG quality, no watermark when officeName absent, composite watermark when present, XML escaping in watermark SVG (9 cases) |
| `__tests__/api/upload.test.ts` | Image Processing | `POST /api/upload` — auth, officeId, missing file, missing fileId, bad MIME, file too large, wrong office, photo limit, happy path, buffer passed to processPropertyPhoto, key/buffer passed to uploadFile, order = photo count (12 cases) |
| `__tests__/hooks/useDraft.test.ts` | Offline Drafts | `loadDraftFromDb` — null when absent, returns stored draft, correct key (3 cases); `saveDraftToDb` — correct key/data, savedAt Date, upsert behavior (3 cases); `clearDraftFromDb` — correct key, resolves safely (2 cases) |
| `__tests__/lib/subscription.test.ts` | Subscription / Billing + Redesign | `resolveSubscription` — FREE plan always ACTIVE, CANCELLED always locked, active far/near expiry, grace window boundaries, locked threshold, PRO/TEAM paid plans use currentPeriodEnd, null currentPeriodEnd locked (14 cases); `getEffectiveSubscription` — null when not found, no DB update when matches, DB update on drift, no update for CANCELLED (4 cases); `PLAN_LIMITS` constants (3); `PLAN_FEATURES` constants (3); `getCurrentShamsiMonth` (1); `getAiUsageThisMonth` (3); `incrementAiUsage` (1) (31 total) |
| `__tests__/api/cron.test.ts` | Subscription Redesign | `POST /api/cron/lock-expired-trials` — missing secret → 401, wrong secret → 401, no expired trials → no-op, expired with >2 users → locks extras, ≤2 users → no lock, multiple offices → sums usersLocked (6 cases) |
| `__tests__/admin-phase2/referral-lib.test.ts` | Admin Phase 2 — Referrals | `generateReferralCode` — no collision, retries on collision; `findActiveReferredOffices` — empty when no referrals, empty when no qualifying subs (8 cases) |
| `__tests__/admin-phase2/referral-codes-api.test.ts` | Admin Phase 2 — Referrals | `GET /api/admin/referral-codes` — 401, 403, SUPER_ADMIN list; `POST` — 403 for MID_ADMIN, code generation, snapshot (7 cases) |
| `__tests__/admin-phase2/mark-paid-api.test.ts` | Admin Phase 2 — Referrals | `POST .../earnings/[earningId]/mark-paid` — 401, 404, 409 already paid, happy path (4 cases) |
| `__tests__/admin-phase2/broadcast-api.test.ts` | Admin Phase 2 — Broadcast | `POST /api/admin/broadcast` — 401, 403, 400 missing fields, broadcast to all managers, 400 missing officeId for ONE target (6 cases) |
| `__tests__/admin-phase2/admin-settings-api.test.ts` | Admin Phase 2 — Settings | `GET /api/admin/settings` — 401, 403 MID_ADMIN, returns all keys; `PATCH` — 403 non-SUPER_ADMIN, upsert, unknown key rejected (7 cases) |
| `__tests__/admin-phase2/users-enhanced-api.test.ts` | Admin Phase 2 — Users | `GET /api/admin/users/[id]` — 401, 404, detail for SUPER_ADMIN; `PATCH` — updates adminNote, active toggle with tier check (8 cases) |
| `__tests__/admin-phase2/ai-usage-api.test.ts` | Admin Phase 2 — AI Usage | `GET /api/admin/ai-usage` — 401, 403, usage data, anomaly flagging for >2× avg (4 cases) |
| `__tests__/admin-phase2/platform-settings.test.ts` | Admin Phase 2 — Settings lib | `getSetting` — found/fallback; `setSetting` — upsert with adminId; `getTrialLengthDays` — default and override (7 cases) |
| `__tests__/admin-tiers/mid-admin-tiers.test.ts` | Mid-Admin Tiers | `canAdminDo` — SUPER_ADMIN always true, null tier always false, SUPPORT/FINANCE/FULL_ACCESS per capability; API enforcement: 403 on wrong tier, pass on correct tier; PATCH tier endpoint SUPER_ADMIN only (23 cases) |
| `__tests__/admin-phase3/office-soft-delete.test.ts` | Admin Phase 3 — Soft Delete | `POST .../archive` — 401, 403, 404, 409 already archived, happy path; `POST .../restore` — 401, 403, 404, 409 not archived, happy path (10 cases) |
| `__tests__/admin-phase3/platform-settings-extended.test.ts` | Admin Phase 3 — Settings lib | `isMaintenanceModeEnabled` — unset/false/true; `getZarinpalMode` — default production; `getAvalaiModel` — default; `getFreePlanLimits` — defaults and DB overrides (11 cases) |
| `__tests__/admin-phase3/settings-api-extended.test.ts` | Admin Phase 3 — Settings API | PATCH new keys: `MAINTENANCE_MODE` valid/invalid, `ZARINPAL_MODE` valid/invalid, `AVALAI_MODEL` valid, `FREE_MAX_*` numeric validation (9 cases) |
| `__tests__/admin-phase3/login-history-api.test.ts` | Admin Phase 3 — Login History | `GET /api/admin/mid-admins/[id]/login-history` — 401, 403, 404 non-MID_ADMIN, empty history, returns ip+userAgent (6 cases) |
| `__tests__/admin-phase3/effective-plan-limits.test.ts` | Admin Phase 3 — Plan Limits | `getEffectivePlanLimits` — PRO hardcoded, TEAM hardcoded, FREE reads from DB, FREE uses defaults when not stored (4 cases) |
