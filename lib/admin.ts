import { format } from "date-fns-jalali"
import { db } from "@/lib/db"
import { PLAN_PRICES_TOMAN } from "@/lib/payment"
import { findActiveReferredOffices } from "@/lib/referral"
import type { AdminTier, Role } from "@/types"

interface SessionUser {
  id: string
  role: Role
  adminTier?: AdminTier | null
}

// ─── Tier Permissions ──────────────────────────────────────────────────────────

export type AdminCapability = "manageSubscriptions" | "manageUsers" | "securityActions" | "broadcast"

const TIER_CAPABILITIES: Record<AdminTier, Record<AdminCapability, boolean>> = {
  SUPPORT:     { manageSubscriptions: false, manageUsers: true,  securityActions: true,  broadcast: true  },
  FINANCE:     { manageSubscriptions: true,  manageUsers: false, securityActions: false, broadcast: true  },
  FULL_ACCESS: { manageSubscriptions: true,  manageUsers: true,  securityActions: true,  broadcast: true  },
}

/**
 * Returns whether the given admin user has permission to perform a capability.
 * SUPER_ADMIN always returns true. MID_ADMIN with no tier = read-only (false).
 */
export const TIER_LABELS: Record<string, string> = {
  SUPPORT: "پشتیبانی",
  FINANCE: "مالی",
  FULL_ACCESS: "دسترسی کامل",
}

export function canAdminDo(
  user: { role: Role; adminTier?: AdminTier | null },
  capability: AdminCapability
): boolean {
  if (user.role === "SUPER_ADMIN") return true
  if (!user.adminTier) return false
  return TIER_CAPABILITIES[user.adminTier][capability] ?? false
}

// Estimated cost per AI description call in Toman (approximate AvalAI pricing).
// Overridable in Phase 2 via admin Settings.
export const AI_UNIT_COST_TOMAN = 80

/**
 * Returns the list of officeIds a given admin user can access.
 * - SUPER_ADMIN  → null (unrestricted — callers must omit the officeId filter)
 * - MID_ADMIN    → string[] of explicitly assigned offices
 */
export async function getAccessibleOfficeIds(
  user: SessionUser
): Promise<string[] | null> {
  if (user.role === "SUPER_ADMIN") return null

  const assignments = await db.adminOfficeAssignment.findMany({
    where: { adminUserId: user.id },
    select: { officeId: true },
  })
  return assignments.map((a) => a.officeId)
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

  let mrr = 0
  for (const sub of subscriptions) {
    const plan = sub.plan as "PRO" | "TEAM"
    const price = PLAN_PRICES_TOMAN[plan]
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
