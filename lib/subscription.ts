import { db } from "@/lib/db"
import type { Plan, SubStatus } from "@/types"

// ─── Types ────────────────────────────────────────────────────────────────────

// Raw subscription data fetched from the DB — only the fields we need.
export interface RawSubscription {
  id: string
  plan: Plan
  status: SubStatus
  trialEndsAt: Date
  currentPeriodEnd: Date | null
}

// The computed, decision-ready subscription state passed to UI and API guards.
export interface ResolvedSubscription {
  // Effective status — may differ from stored DB status if the row hasn't been
  // lazily updated yet (e.g. trial ended overnight, status still says ACTIVE).
  status: SubStatus
  // Whether this office may perform write operations (create/edit/delete).
  canWrite: boolean
  // Days until expiry as a float. Negative values mean the subscription has
  // already expired (e.g. -3.2 means ~3 days ago).
  daysUntilExpiry: number
  // Remaining days inside the 7-day grace window. Only meaningful when
  // status === "GRACE". 0 when not in grace.
  graceDaysLeft: number
  // True when the subscription is still ACTIVE but expires within 7 days.
  // Used to show the pre-expiry reminder banner.
  isNearExpiry: boolean
}

const MS_PER_DAY = 1000 * 60 * 60 * 24
const GRACE_DAYS = 7
const NEAR_EXPIRY_DAYS = 7

// ─── Core Logic ───────────────────────────────────────────────────────────────

/**
 * Pure function — derives the effective subscription state from raw DB fields.
 * No database calls; fully testable without mocks.
 *
 * Transition thresholds:
 *   daysUntilExpiry > 7   → ACTIVE (not near expiry)
 *   0 < days <= 7         → ACTIVE (near expiry — show reminder banner)
 *   -7 < days <= 0        → GRACE  (full write access + warning banner)
 *   days <= -7            → LOCKED (read-only)
 *   status === CANCELLED  → always LOCKED (admin override — respected as-is)
 */
export function resolveSubscription(sub: RawSubscription): ResolvedSubscription {
  // Admin-cancelled offices are always locked regardless of dates.
  if (sub.status === "CANCELLED") {
    return {
      status: "CANCELLED",
      canWrite: false,
      daysUntilExpiry: -Infinity,
      graceDaysLeft: 0,
      isNearExpiry: false,
    }
  }

  // Determine which date field governs this plan.
  const expiryDate: Date | null =
    sub.plan === "TRIAL" ? sub.trialEndsAt : sub.currentPeriodEnd

  // A paid plan with no currentPeriodEnd is treated as immediately expired
  // (defensive — this should not happen after a successful payment).
  if (!expiryDate) {
    return {
      status: "LOCKED",
      canWrite: false,
      daysUntilExpiry: -Infinity,
      graceDaysLeft: 0,
      isNearExpiry: false,
    }
  }

  const daysUntilExpiry = (expiryDate.getTime() - Date.now()) / MS_PER_DAY

  // Not expired yet
  if (daysUntilExpiry > NEAR_EXPIRY_DAYS) {
    return { status: "ACTIVE", canWrite: true, daysUntilExpiry, graceDaysLeft: 0, isNearExpiry: false }
  }
  if (daysUntilExpiry > 0) {
    return { status: "ACTIVE", canWrite: true, daysUntilExpiry, graceDaysLeft: 0, isNearExpiry: true }
  }

  // Expired — determine grace vs locked
  if (daysUntilExpiry > -GRACE_DAYS) {
    const graceDaysLeft = Math.ceil(GRACE_DAYS + daysUntilExpiry)
    return { status: "GRACE", canWrite: true, daysUntilExpiry, graceDaysLeft, isNearExpiry: false }
  }

  return { status: "LOCKED", canWrite: false, daysUntilExpiry, graceDaysLeft: 0, isNearExpiry: false }
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

// ─── API Route Guard ──────────────────────────────────────────────────────────

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
