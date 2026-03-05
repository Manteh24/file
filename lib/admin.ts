import { format } from "date-fns-jalali"
import { db } from "@/lib/db"
import { PLAN_PRICES_TOMAN } from "@/lib/payment"
import type { Role } from "@/types"

interface SessionUser {
  id: string
  role: Role
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
