# Plan: Mid-Admin Permission Tiers

## What we're building

3 predefined tiers for mid-admins, selectable by super admin at creation time and editable anytime. Mid-admins with no tier assigned get **read-only** access.

### Tier definitions

| Tier | manageSubscriptions | manageUsers | securityActions | broadcast |
|------|:---:|:---:|:---:|:---:|
| **Support** | ❌ | ✅ | ✅ | ✅ |
| **Finance** | ✅ | ❌ | ❌ | ✅ |
| **Full Access** | ✅ | ✅ | ✅ | ✅ |
| *(no tier — read-only)* | ❌ | ❌ | ❌ | ❌ |

### Capability → gated endpoints

| Capability | Gated endpoints |
|-----------|----------------|
| `manageSubscriptions` | `PATCH /api/admin/offices/[id]/subscription`, `POST .../suspend`, `POST .../reactivate` |
| `manageUsers` | `PATCH /api/admin/users/[id]/active` |
| `securityActions` | `PATCH /api/admin/users/[id]/force-logout`, `PATCH .../reset-password` |
| `broadcast` | `POST /api/admin/broadcast` |

---

## Steps

### 1. Prisma schema
- Add `AdminTier` enum: `SUPPORT | FINANCE | FULL_ACCESS`
- Add `adminTier AdminTier?` field on the `User` model (null-safe — existing mid-admins default to null → read-only)
- Run `npx prisma migrate dev`

### 2. Session / JWT — add adminTier
- In `lib/auth.ts`: store `adminTier` from DB user into JWT token in the `jwt` callback; expose it on `session.user` in the `session` callback
- Augment `@auth/core/jwt` type declaration to include `adminTier`
- Augment `Session["user"]` type to include `adminTier`

### 3. lib/admin.ts — new helper
Add two exports:
- `TIER_CAPABILITIES` constant (the map above)
- `canAdminDo(user, capability)` — returns `true` always for `SUPER_ADMIN`, `false` for null tier, or looks up capability in the map for `MID_ADMIN`

### 4. lib/validations/admin.ts
- Add optional `tier` field to `createMidAdminSchema`
- Add new `updateMidAdminTierSchema` for the PATCH endpoint

### 5. types/index.ts
- Add `AdminTier` type
- Add `adminTier` field to `MidAdminSummary`

### 6. API — capability checks (7 routes, each 2-3 line change)
In each gated endpoint, after the existing auth + scope check, add:
```ts
if (session.user.role === "MID_ADMIN" && !canAdminDo(session.user, "manageSubscriptions")) {
  return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 })
}
```
Routes: subscription PATCH, suspend POST, reactivate POST, users/active PATCH, force-logout PATCH, reset-password PATCH, broadcast POST

### 7. NEW: app/api/admin/mid-admins/[id]/route.ts
Single PATCH handler — SUPER_ADMIN only. Updates `adminTier` on a mid-admin. Logs `UPDATE_MID_ADMIN_TIER` audit action.

### 8. app/api/admin/mid-admins/route.ts (POST)
Accept optional `tier` in request body and save it as `adminTier` on creation.

### 9. UI — MidAdminForm component
- `CreateMidAdminForm`: add tier radio/select (Support / Finance / Full Access / بدون سطح دسترسی)
- Add `EditTierForm` component: shown on mid-admin detail page. 4-option radio group with save button. PATCH call to `/api/admin/mid-admins/[id]`. Persian tier labels.

### 10. UI — Pages
- `app/(admin)/admin/mid-admins/page.tsx`: add "سطح دسترسی" column to the table
- `app/(admin)/admin/mid-admins/[userId]/page.tsx`: fetch `adminTier`, add `EditTierForm` section below the office assignments panel

### 11. Tests
New test file `__tests__/admin/mid-admin-tiers.test.ts`:
- `canAdminDo` unit tests for all tier/capability combinations
- API enforcement: PATCH subscription with SUPPORT tier → 403; with FINANCE tier → passes
- PATCH active with FINANCE tier → 403; with SUPPORT/FULL_ACCESS → passes
- POST broadcast with null tier → 403
- PATCH tier endpoint: SUPER_ADMIN succeeds, MID_ADMIN → 403

---

## File count

| Category | Files |
|----------|-------|
| Schema + migration | 1 |
| Auth session | 1 |
| Core logic (admin.ts, validations, types) | 3 |
| API routes changed | 7 |
| API route created | 1 |
| UI components | 1 |
| Pages | 2 |
| Tests | 1 |
| **Total** | **17** |
