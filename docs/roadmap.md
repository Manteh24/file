# Admin Panel Roadmap

## Phase 2 — Growth Operations (next sprint)

| Section | What to Build |
|---------|--------------|
| **Referral Program** | `ReferralCode` + `Referral` + `ReferralCommission` models. Admin pages: referrers list, per-referrer detail, pending commissions, mark-as-paid, leaderboard, code generator, disable code. KPI Group 3 metrics become live. |
| **AI Usage Monitoring** | Dedicated `/admin/ai-usage` page: per-office monthly breakdown, cost trend, FREE-at-limit list, anomaly flagging (office > 2× avg). |
| **Notifications & Communication** | `AdminBroadcast` model. Send message to one office (via Notification record). Broadcast to all/filtered offices. Message history page. |
| **Users Management (enhanced)** | User detail page. Force logout (delete UserSession rows). Admin-initiated password reset. Move user between offices. Flag/note on user. |
| **Settings (partial)** | CAC input field (marketing spend → auto-calculates CAC = spend/new paid offices). Configurable `AI_UNIT_COST_TOMAN`. Trial length config. |

## Phase 3 — Optimization (at scale)

| Section | What to Build |
|---------|--------------|
| **System Health** | `CronLog` model. Cron job execution log viewer. KaveNegar SMS delivery webhook log. Failed API call log (server-side error collector). |
| **Content & Files Overview** | Platform-wide files page: total active files, files created per day chart, public link view totals, most-viewed files. |
| **Settings (full editor)** | Plan limits editor (override `PLAN_LIMITS` at runtime). Feature flags per plan. Zarinpal config (test/live mode toggle). AvalAI model/temperature config. Maintenance mode banner. |
| **Office Soft Delete** | Add `deletedAt DateTime?` to Office. Update all tenant queries with `where: { deletedAt: null }`. Admin "archive office" button. Restore option. |
| **NPS Collection** | `NpsResponse` model (officeId, score 0–10, comment, createdAt). Triggered via email/SMS link after 30 days of use. Rolling 90-day NPS in KPI Group 6. |
| **Admin Login History** | `AdminSession` log model. Show last N logins per admin user with IP/UA in admin user detail. |
