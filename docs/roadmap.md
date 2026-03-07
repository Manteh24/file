# Admin Panel Roadmap

## Phase 2 — Growth Operations ✅ Complete

| Section | Status |
|---------|--------|
| **Referral Program** | ✅ `ReferralCode`, `Referral`, `ReferralMonthlyEarning` models. Referrers list, per-referrer detail, pending commissions, mark-as-paid. KPI Group 3 live. |
| **AI Usage Monitoring** | ✅ `/admin/ai-usage` — per-office monthly breakdown, cost trend, anomaly flagging (office > 2× avg). |
| **Notifications & Communication** | ✅ `AdminBroadcast` model. Broadcast to all/one office. Message history page. |
| **Users Management (enhanced)** | ✅ User detail page. Force logout, admin-initiated password reset, adminNote field. |
| **Settings (partial)** | ✅ `PlatformSetting` table. `getSetting`/`setSetting`. Configurable trial length + AI unit cost. |

## Phase 3 — Optimization ✅ Complete (core items)

| Section | Status |
|---------|--------|
| **Settings (full editor)** | ✅ 6 runtime keys: `MAINTENANCE_MODE`, `ZARINPAL_MODE`, `AVALAI_MODEL`, `FREE_MAX_USERS`, `FREE_MAX_FILES`, `FREE_MAX_AI_MONTH`. 30s cache. Wired into middleware, ai.ts, payment.ts, subscription.ts. |
| **Office Soft Delete** | ✅ `deletedAt DateTime?` on Office. Archive/restore routes. All list/count queries filtered. `ArchiveRestoreButtons` UI (SUPER_ADMIN only). |
| **Admin Login History** | ✅ `AdminLoginLog` model. Fire-and-forget on auth.ts login. `GET /api/admin/mid-admins/[id]/login-history`. Table on mid-admin detail page. |
| **System Health** | ❌ Not built — `CronLog`, SMS delivery webhook log, failed API call log |
| **Content & Files Overview** | ❌ Not built — platform-wide files page, charts |
| **NPS Collection** | ❌ Not built — `NpsResponse` model, triggered survey flow |

## Next Steps

- Production deployment (Prisma migrations on VPS)
- Create PWA icons (`public/icons/icon-192.png`, `icon-512.png`) + configure `next-pwa` in `next.config.ts`
- Remaining Phase 3 items (System Health, Content Overview, NPS) — deferred to post-launch
