import { format } from "date-fns-jalali"
import type { Prisma } from "@/app/generated/prisma/client"
import { db } from "@/lib/db"
import { getEffectivePlanPrices } from "@/lib/plan-pricing"
import { findActiveReferredOffices } from "@/lib/referral"
import type { AdminTier, Role } from "@/types"
import {
  ADMIN_CAPABILITIES,
  ADMIN_CAPABILITY_LABELS,
  type AdminCapability,
  type AdminPermissionsOverride,
} from "@/lib/admin-client"

interface SessionUser {
  id: string
  role: Role
  adminTier?: AdminTier | null
}

// ─── Tier Permissions ──────────────────────────────────────────────────────────
// Constants re-exported from lib/admin-client (client-safe split).
export {
  ADMIN_CAPABILITIES,
  ADMIN_CAPABILITY_LABELS,
}
export type { AdminCapability, AdminPermissionsOverride }

const TIER_CAPABILITIES: Record<AdminTier, Record<AdminCapability, boolean>> = {
  SUPPORT:     { manageSubscriptions: false, manageUsers: true,  securityActions: true,  broadcast: true  },
  FINANCE:     { manageSubscriptions: true,  manageUsers: false, securityActions: false, broadcast: true  },
  FULL_ACCESS: { manageSubscriptions: true,  manageUsers: true,  securityActions: true,  broadcast: true  },
}

export const TIER_LABELS: Record<string, string> = {
  SUPPORT: "پشتیبانی",
  FINANCE: "مالی",
  FULL_ACCESS: "دسترسی کامل",
}

/**
 * Returns the effective set of capabilities for an admin user, after merging
 * tier defaults with any per-capability overrides.
 *
 * Note: `AdminPermissionsOverride` lives in lib/admin-client (client-safe).
 * Stored on User.permissionsOverride (shared with office-member overrides;
 * admins have officeId=null so the keysets do not collide with office
 * capabilities in practice — but the same column is used).
 */
export function getAdminCapabilities(
  user: {
    role: Role
    adminTier?: AdminTier | null
    permissionsOverride?: AdminPermissionsOverride | unknown | null
  }
): Record<AdminCapability, boolean> {
  if (user.role === "SUPER_ADMIN") {
    return { manageSubscriptions: true, manageUsers: true, securityActions: true, broadcast: true }
  }

  const base: Record<AdminCapability, boolean> = user.adminTier
    ? { ...TIER_CAPABILITIES[user.adminTier] }
    : { manageSubscriptions: false, manageUsers: false, securityActions: false, broadcast: false }

  // Treat the JSON column as untyped — only honour known capability keys with boolean values.
  const override = (user.permissionsOverride ?? null) as Record<string, unknown> | null
  if (override && typeof override === "object") {
    for (const cap of ADMIN_CAPABILITIES) {
      const v = override[cap]
      if (typeof v === "boolean") base[cap] = v
    }
  }
  return base
}

/**
 * Returns whether the given admin user has permission to perform a capability.
 * SUPER_ADMIN always returns true. MID_ADMIN with no tier = read-only by
 * default — but per-capability overrides on `permissionsOverride` win over the
 * tier preset, so a tier-less mid-admin can still be granted a single ability.
 */
export function canAdminDo(
  user: {
    role: Role
    adminTier?: AdminTier | null
    permissionsOverride?: AdminPermissionsOverride | unknown | null
  },
  capability: AdminCapability
): boolean {
  if (user.role === "SUPER_ADMIN") return true
  return getAdminCapabilities(user)[capability] ?? false
}

// Estimated cost per AI description call in Toman (approximate AvalAI pricing).
// Overridable in Phase 2 via admin Settings.
export const AI_UNIT_COST_TOMAN = 80

/**
 * Returns the list of officeIds a given admin user can access.
 * - SUPER_ADMIN  → null (unrestricted — callers must omit the officeId filter)
 * - MID_ADMIN    → union of (a) explicitly assigned offices and (b) offices
 *                  matching any AdminAccessRule (dynamic: city / plan / trial).
 *   Rule-based matches are evaluated live per request so newly-registered
 *   offices join automatically without re-assigning.
 */
export async function getAccessibleOfficeIds(
  user: SessionUser
): Promise<string[] | null> {
  if (user.role === "SUPER_ADMIN") return null

  const [assignments, rules] = await Promise.all([
    db.adminOfficeAssignment.findMany({
      where: { adminUserId: user.id },
      select: { officeId: true },
    }),
    db.adminAccessRule.findMany({
      where: { adminUserId: user.id },
      select: { cities: true, plans: true, trialFilter: true },
    }),
  ])

  const ids = new Set<string>(assignments.map((a) => a.officeId))

  if (rules.length > 0) {
    const ruleClauses: Prisma.OfficeWhereInput[] = rules.map((rule) => {
      const where: Prisma.OfficeWhereInput = { deletedAt: null }
      if (rule.cities.length > 0) where.city = { in: rule.cities }

      const subWhere: Prisma.SubscriptionWhereInput = {}
      if (rule.plans.length > 0) subWhere.plan = { in: rule.plans }
      if (rule.trialFilter === "TRIAL_ONLY") subWhere.isTrial = true
      if (rule.trialFilter === "PAID_ONLY") subWhere.isTrial = false
      if (Object.keys(subWhere).length > 0) where.subscription = subWhere

      return where
    })

    const matched = await db.office.findMany({
      where: { OR: ruleClauses },
      select: { id: true },
    })
    for (const o of matched) ids.add(o.id)
  }

  return Array.from(ids)
}

/**
 * Builds a Prisma `where` clause fragment for filtering by accessible offices.
 * Returns an empty object (no filter) for SUPER_ADMIN, or { id: { in: [...] } }
 * for MID_ADMIN. Use with `db.office.findMany({ where: { ...officeFilter } })`.
 */
export function buildOfficeFilter(
  accessibleIds: string[] | null
): { id?: { in: string[] } } {
  if (accessibleIds === null) return {}
  return { id: { in: accessibleIds } }
}

// ─── AdminActionLog ────────────────────────────────────────────────────────────

/**
 * Appends an entry to the admin audit log.
 * Fire-and-forget safe — errors are logged but never thrown to callers.
 */
export async function logAdminAction(
  adminId: string,
  action: string,
  targetType: string,
  targetId: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  try {
    await db.adminActionLog.create({
      data: { adminId, action, targetType, targetId, metadata: metadata as object | undefined },
    })
  } catch (err) {
    console.error("[admin] logAdminAction failed:", err)
  }
}

// ─── KPI Helpers ───────────────────────────────────────────────────────────────

/**
 * Computes Monthly Recurring Revenue (MRR) in Toman for active paid subscriptions
 * within the given office filter. Annual subscriptions are normalised to monthly.
 */
export async function calculateMrr(
  officeFilter: { id?: { in: string[] } }
): Promise<number> {
  const subscriptions = await db.subscription.findMany({
    where: {
      office: officeFilter,
      plan: { in: ["PRO", "TEAM"] },
      status: { in: ["ACTIVE", "GRACE"] },
    },
    select: { plan: true, billingCycle: true },
  })

  const { toman } = await getEffectivePlanPrices()
  let mrr = 0
  for (const sub of subscriptions) {
    const plan = sub.plan as "PRO" | "TEAM"
    const price = toman[plan]
    if (sub.billingCycle === "MONTHLY") {
      mrr += price.MONTHLY
    } else {
      // Annual → monthly-normalised (÷ 10, not ÷ 12, because annual = 10 months)
      mrr += Math.round(price.ANNUAL / 10)
    }
  }
  return mrr
}

/**
 * Estimates churn rate as (LOCKED + CANCELLED) / (ACTIVE + GRACE + LOCKED).
 * Returns a formatted percentage string, e.g. "۱۲.۵٪".
 * Returns "—" if denominator is 0 (no paid offices).
 */
export async function calculateChurnRate(
  officeFilter: { id?: { in: string[] } }
): Promise<string> {
  const [active, grace, locked, cancelled] = await Promise.all([
    db.subscription.count({ where: { office: officeFilter, status: "ACTIVE", plan: { in: ["PRO", "TEAM"] } } }),
    db.subscription.count({ where: { office: officeFilter, status: "GRACE", plan: { in: ["PRO", "TEAM"] } } }),
    db.subscription.count({ where: { office: officeFilter, status: "LOCKED", plan: { in: ["PRO", "TEAM"] } } }),
    db.subscription.count({ where: { office: officeFilter, status: "CANCELLED", plan: { in: ["PRO", "TEAM"] } } }),
  ])
  const denominator = active + grace + locked
  if (denominator === 0) return "—"
  const rate = ((locked + cancelled) / denominator) * 100
  return `${rate.toLocaleString("fa-IR", { maximumFractionDigits: 1 })}٪`
}

/**
 * Trial-to-paid conversion rate: paid (non-trial PRO/TEAM) / all PRO+TEAM subscriptions.
 * Returns a formatted percentage string or "—" if no paid offices.
 */
export async function calculateTrialConversionRate(
  officeFilter: { id?: { in: string[] } }
): Promise<string> {
  const [total, paid] = await Promise.all([
    db.subscription.count({ where: { office: officeFilter, plan: { in: ["PRO", "TEAM"] } } }),
    db.subscription.count({ where: { office: officeFilter, plan: { in: ["PRO", "TEAM"] }, isTrial: false } }),
  ])
  if (total === 0) return "—"
  const rate = (paid / total) * 100
  return `${rate.toLocaleString("fa-IR", { maximumFractionDigits: 1 })}٪`
}

/**
 * Estimates AI description cost this Shamsi month across all accessible offices.
 * Total calls × AI_UNIT_COST_TOMAN.
 */
export async function calculateAiCostThisMonth(
  officeFilter: { id?: { in: string[] } }
): Promise<number> {
  const shamsiMonth = parseInt(format(new Date(), "yyyyMM"), 10)
  const logs = await db.aiUsageLog.aggregate({
    where: { office: officeFilter, shamsiMonth },
    _sum: { count: true },
  })
  return (logs._sum.count ?? 0) * AI_UNIT_COST_TOMAN
}

// ─── Referral KPI Helpers ──────────────────────────────────────────────────────

export interface ReferralKpiData {
  participationRate: string
  referralConversionRate: string
  activeReferrers: number
  avgOfficesPerReferrer: string
  commissionThisMonth: number
}

/**
 * Computes referral KPI metrics for Group 3.
 * officeFilter scopes to accessible offices.
 * yearMonth: Gregorian "YYYY-MM" for current-month commission sum.
 */
export async function calculateReferralKpis(
  officeFilter: { id?: { in: string[] } },
  yearMonth: string
): Promise<ReferralKpiData> {
  // Total offices in scope (active only — archived offices excluded from KPIs)
  const totalOffices = await db.office.count({ where: { ...officeFilter, deletedAt: null } })

  // Offices that have a non-null referralCode stored
  const officesWithCode = await db.office.count({
    where: { ...officeFilter, deletedAt: null, referralCode: { not: null } },
  })

  // Participation rate: offices that entered a referral code / total
  const participationRate =
    totalOffices > 0
      ? `${((officesWithCode / totalOffices) * 100).toLocaleString("fa-IR", { maximumFractionDigits: 1 })}٪`
      : "—"

  // Referral conversion: offices with Referral record AND isTrial=false / all offices with Referral record
  const [totalReferred, convertedReferred] = await Promise.all([
    db.referral.count({ where: { office: officeFilter } }),
    db.referral.count({
      where: {
        office: { ...officeFilter, subscription: { isTrial: false } },
      },
    }),
  ])
  const referralConversionRate =
    totalReferred > 0
      ? `${((convertedReferred / totalReferred) * 100).toLocaleString("fa-IR", { maximumFractionDigits: 1 })}٪`
      : "—"

  // Active referrers: codes with ≥1 active paid referral
  const allCodes = await db.referralCode.findMany({
    where:
      officeFilter.id !== undefined
        ? { OR: [{ officeId: { in: officeFilter.id.in } }, { officeId: null }] }
        : {},
    select: { id: true },
  })

  let activeReferrers = 0
  let totalActivePaidReferrals = 0
  for (const c of allCodes) {
    const activeIds = await findActiveReferredOffices(c.id)
    if (activeIds.length > 0) {
      activeReferrers++
      totalActivePaidReferrals += activeIds.length
    }
  }

  const avgOfficesPerReferrer =
    activeReferrers > 0
      ? (totalActivePaidReferrals / activeReferrers).toLocaleString("fa-IR", { maximumFractionDigits: 1 })
      : "—"

  // Commission this month: sum of ReferralMonthlyEarning for the given month
  const earningsAgg = await db.referralMonthlyEarning.aggregate({
    where: { yearMonth },
    _sum: { commissionAmount: true },
  })
  const commissionThisMonth = Number(earningsAgg._sum.commissionAmount ?? BigInt(0))

  return {
    participationRate,
    referralConversionRate,
    activeReferrers,
    avgOfficesPerReferrer,
    commissionThisMonth,
  }
}
