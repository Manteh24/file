import { format } from "date-fns-jalali"
import { db } from "@/lib/db"
import { getFreePlanLimits } from "@/lib/platform-settings"
import type { Plan, BillingCycle, SubStatus } from "@/types"

// ─── Plan Feature Definitions ─────────────────────────────────────────────────

export const PLAN_LIMITS = {
  FREE: { maxUsers: 1, maxActiveFiles: 10, maxAiPerMonth: 10, maxSmsPerMonth: 30 },
  PRO:  { maxUsers: 10, maxActiveFiles: Infinity, maxAiPerMonth: Infinity, maxSmsPerMonth: Infinity },
  TEAM: { maxUsers: Infinity, maxActiveFiles: Infinity, maxAiPerMonth: Infinity, maxSmsPerMonth: Infinity },
} as const

export const PLAN_FEATURES = {
  FREE: {
    hasShareSms: true,
    hasBulkSms: false,
    hasMaps: true,
    hasMapEnrichment: false,
    hasReports: false,
    hasPdfExport: false,
    hasLinkTracking: false,
    hasCustomBranding: false,
    hasAdvancedAnalytics: false,
    hasMultiBranch: false,
    watermarkLinks: true,
  },
  PRO: {
    hasShareSms: true,
    hasBulkSms: true,
    hasMaps: true,
    hasMapEnrichment: true,
    hasReports: true,
    hasPdfExport: true,
    hasLinkTracking: true,
    hasCustomBranding: true,
    hasAdvancedAnalytics: false,
    hasMultiBranch: false,
    watermarkLinks: false,
  },
  TEAM: {
    hasShareSms: true,
    hasBulkSms: true,
    hasMaps: true,
    hasMapEnrichment: true,
    hasReports: true,
    hasPdfExport: true,
    hasLinkTracking: true,
    hasCustomBranding: true,
    hasAdvancedAnalytics: true,
    hasMultiBranch: true,
    watermarkLinks: false,
  },
} as const

// ─── Types ────────────────────────────────────────────────────────────────────

// Raw subscription data fetched from the DB — only the fields we need.
export interface RawSubscription {
  id: string
  plan: Plan
  status: SubStatus
  isTrial: boolean
  billingCycle: BillingCycle
  trialEndsAt: Date | null
  currentPeriodEnd: Date | null
}

// The computed, decision-ready subscription state passed to UI and API guards.
export interface ResolvedSubscription {
  plan: Plan
  billingCycle: BillingCycle
  // Effective status — may differ from stored DB status if the row hasn't been
  // lazily updated yet (e.g. trial ended overnight, status still says ACTIVE).
  status: SubStatus
  // Whether this office may perform write operations (create/edit/delete).
  canWrite: boolean
  // Days until expiry as a float. Negative values mean the subscription has
  // already expired. Infinity for FREE plan (never expires).
  daysUntilExpiry: number
  // Remaining days inside the 7-day grace window. Only meaningful when
  // status === "GRACE". 0 when not in grace.
  graceDaysLeft: number
  // True when the subscription is still ACTIVE but expires within 7 days.
  // Used to show the pre-expiry reminder banner.
  isNearExpiry: boolean
  // True while on a free trial period (PRO or TEAM trial). Always false for FREE plan.
  isTrial: boolean
}

const MS_PER_DAY = 1000 * 60 * 60 * 24
const GRACE_DAYS = 7
const NEAR_EXPIRY_DAYS = 7

// ─── Core Logic ───────────────────────────────────────────────────────────────

/**
 * Pure function — derives the effective subscription state from raw DB fields.
 * No database calls; fully testable without mocks.
 *
 * FREE plan:   always ACTIVE, canWrite: true, never expires.
 * CANCELLED:   always LOCKED (admin override — respected as-is).
 * Trial/Paid:  expiry driven by trialEndsAt (isTrial=true) or currentPeriodEnd.
 *
 * Transition thresholds for expiring plans:
 *   daysUntilExpiry > 7   → ACTIVE (not near expiry)
 *   0 < days <= 7         → ACTIVE (near expiry — show reminder banner)
 *   -7 < days <= 0        → GRACE  (full write access + warning banner)
 *   days <= -7            → LOCKED (read-only)
 */
export function resolveSubscription(sub: RawSubscription): ResolvedSubscription {
  const base = { plan: sub.plan, billingCycle: sub.billingCycle, isTrial: sub.isTrial }

  // FREE plan never expires — always fully active, no banners needed.
  if (sub.plan === "FREE") {
    return {
      ...base,
      status: "ACTIVE",
      canWrite: true,
      daysUntilExpiry: Infinity,
      graceDaysLeft: 0,
      isNearExpiry: false,
    }
  }

  // Admin-cancelled offices are always locked regardless of dates.
  if (sub.status === "CANCELLED") {
    return {
      ...base,
      status: "CANCELLED",
      canWrite: false,
      daysUntilExpiry: -Infinity,
      graceDaysLeft: 0,
      isNearExpiry: false,
    }
  }

  // Determine which date field governs expiry.
  // isTrial=true → trialEndsAt; paid → currentPeriodEnd.
  const expiryDate: Date | null = sub.isTrial ? sub.trialEndsAt : sub.currentPeriodEnd

  // A paid plan with no currentPeriodEnd is treated as immediately expired
  // (defensive — this should not happen after a successful payment).
  if (!expiryDate) {
    return {
      ...base,
      status: "LOCKED",
      canWrite: false,
      daysUntilExpiry: -Infinity,
      graceDaysLeft: 0,
      isNearExpiry: false,
    }
  }

  const daysUntilExpiry = (expiryDate.getTime() - Date.now()) / MS_PER_DAY

  if (daysUntilExpiry > NEAR_EXPIRY_DAYS) {
    return { ...base, status: "ACTIVE", canWrite: true, daysUntilExpiry, graceDaysLeft: 0, isNearExpiry: false }
  }
  if (daysUntilExpiry > 0) {
    return { ...base, status: "ACTIVE", canWrite: true, daysUntilExpiry, graceDaysLeft: 0, isNearExpiry: true }
  }
  if (daysUntilExpiry > -GRACE_DAYS) {
    const graceDaysLeft = Math.ceil(GRACE_DAYS + daysUntilExpiry)
    return { ...base, status: "GRACE", canWrite: true, daysUntilExpiry, graceDaysLeft, isNearExpiry: false }
  }

  return { ...base, status: "LOCKED", canWrite: false, daysUntilExpiry, graceDaysLeft: 0, isNearExpiry: false }
}

// ─── DB-Touching Helpers ──────────────────────────────────────────────────────

/**
 * Fetches the subscription for an office, resolves the effective state, and
 * lazily updates the stored status in the DB if it has drifted — so automatic
 * ACTIVE → GRACE → LOCKED transitions happen without a cron job.
 *
 * Returns null if no subscription row exists (edge case for legacy data).
 */
export async function getEffectiveSubscription(
  officeId: string
): Promise<ResolvedSubscription | null> {
  const sub = await db.subscription.findUnique({
    where: { officeId },
    select: {
      id: true,
      plan: true,
      status: true,
      isTrial: true,
      billingCycle: true,
      trialEndsAt: true,
      currentPeriodEnd: true,
    },
  })

  if (!sub) return null

  const resolved = resolveSubscription(sub as RawSubscription)

  // Lazy status migration: update the DB row if the effective status has
  // drifted from what was stored. Never silently un-cancel a CANCELLED office.
  if (resolved.status !== sub.status && sub.status !== "CANCELLED") {
    await db.subscription.update({
      where: { id: sub.id },
      data: { status: resolved.status },
    })
  }

  return resolved
}

// ─── AI Usage Helpers ─────────────────────────────────────────────────────────

/**
 * Returns the current Shamsi calendar month as a YYYYMM integer.
 * Example: Farvardin 1404 → 140401, Esfand 1403 → 140312.
 */
export function getCurrentShamsiMonth(): number {
  return parseInt(format(new Date(), "yyyyMM"), 10)
}

/**
 * Returns the number of AI description calls made by the office this Shamsi month.
 */
export async function getAiUsageThisMonth(officeId: string): Promise<number> {
  const shamsiMonth = getCurrentShamsiMonth()
  const log = await db.aiUsageLog.findUnique({
    where: { officeId_shamsiMonth: { officeId, shamsiMonth } },
    select: { count: true },
  })
  return log?.count ?? 0
}

/**
 * Increments the AI usage counter for the office in the current Shamsi month.
 * Uses upsert so the row is created on first use and incremented thereafter.
 */
export async function incrementAiUsage(officeId: string): Promise<void> {
  const shamsiMonth = getCurrentShamsiMonth()
  await db.aiUsageLog.upsert({
    where: { officeId_shamsiMonth: { officeId, shamsiMonth } },
    create: { officeId, shamsiMonth, count: 1 },
    update: { count: { increment: 1 } },
  })
}

// ─── Plan Limit Helpers ───────────────────────────────────────────────────────

/**
 * Returns the number of active users (managers + agents) in the office.
 */
export async function getUserCount(officeId: string): Promise<number> {
  return db.user.count({
    where: { officeId, isActive: true },
  })
}

/**
 * Returns the number of currently ACTIVE property files for the office.
 */
export async function getActiveFileCount(officeId: string): Promise<number> {
  return db.propertyFile.count({
    where: { officeId, status: "ACTIVE" },
  })
}

// ─── Effective Plan Limits ────────────────────────────────────────────────────

export interface PlanLimits {
  maxUsers: number
  maxActiveFiles: number
  maxAiPerMonth: number
  maxSmsPerMonth: number
}

/**
 * Returns the effective plan limits for the given plan.
 * PRO and TEAM limits are hardcoded (unlimited for most fields).
 * FREE limits are overridable at runtime via platform settings.
 */
export async function getEffectivePlanLimits(plan: Plan): Promise<PlanLimits> {
  if (plan !== "FREE") {
    return PLAN_LIMITS[plan] as PlanLimits
  }
  return getFreePlanLimits()
}

// ─── SMS Usage Helpers ────────────────────────────────────────────────────────

/**
 * Returns the number of share SMS sends made by the office this Shamsi month.
 */
export async function getSmsUsageThisMonth(officeId: string): Promise<number> {
  const shamsiMonth = getCurrentShamsiMonth()
  const log = await db.smsUsageLog.findUnique({
    where: { officeId_shamsiMonth: { officeId, shamsiMonth } },
    select: { count: true },
  })
  return log?.count ?? 0
}

/**
 * Increments the SMS usage counter for the office in the current Shamsi month.
 * Uses upsert so the row is created on first use and incremented thereafter.
 */
export async function incrementSmsUsage(officeId: string): Promise<void> {
  const shamsiMonth = getCurrentShamsiMonth()
  await db.smsUsageLog.upsert({
    where: { officeId_shamsiMonth: { officeId, shamsiMonth } },
    create: { officeId, shamsiMonth, count: 1 },
    update: { count: { increment: 1 } },
  })
}

// ─── API Route Guards ─────────────────────────────────────────────────────────

export class SubscriptionLockedError extends Error {
  constructor() {
    super("اشتراک شما منقضی شده است")
    this.name = "SubscriptionLockedError"
  }
}

/**
 * Throws SubscriptionLockedError if the office's subscription does not allow
 * write operations (status is LOCKED or CANCELLED).
 *
 * Call this in write API route handlers after the officeId guard.
 */
export async function requireWriteAccess(officeId: string): Promise<void> {
  const resolved = await getEffectiveSubscription(officeId)
  if (!resolved || !resolved.canWrite) {
    throw new SubscriptionLockedError()
  }
}
