import { describe, it, expect, vi, beforeEach } from "vitest"
import {
  resolveSubscription,
  getEffectiveSubscription,
  PLAN_LIMITS,
  PLAN_FEATURES,
  getCurrentShamsiMonth,
  getAiUsageThisMonth,
  incrementAiUsage,
} from "@/lib/subscription"
import type { RawSubscription } from "@/lib/subscription"

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Creates a RawSubscription with the expiry date shifted by `daysFromNow`.
 * Positive = future, negative = past.
 * isTrial=true uses trialEndsAt; isTrial=false uses currentPeriodEnd.
 */
function makeSub(
  daysFromNow: number,
  plan: RawSubscription["plan"] = "PRO",
  status: RawSubscription["status"] = "ACTIVE",
  isTrial = true
): RawSubscription {
  const expiry = new Date()
  expiry.setTime(expiry.getTime() + daysFromNow * 24 * 60 * 60 * 1000)

  return {
    id: "sub-test-1",
    plan,
    status,
    isTrial,
    billingCycle: "MONTHLY",
    trialEndsAt: isTrial ? expiry : null,
    currentPeriodEnd: !isTrial ? expiry : null,
  }
}

// ─── resolveSubscription ──────────────────────────────────────────────────────

describe("resolveSubscription", () => {
  describe("FREE plan — always ACTIVE, never expires", () => {
    it("returns ACTIVE canWrite=true daysUntilExpiry=Infinity for FREE plan", () => {
      const sub: RawSubscription = {
        id: "sub-free",
        plan: "FREE",
        status: "ACTIVE",
        isTrial: false,
        billingCycle: "MONTHLY",
        trialEndsAt: null,
        currentPeriodEnd: null,
      }
      const result = resolveSubscription(sub)
      expect(result.status).toBe("ACTIVE")
      expect(result.canWrite).toBe(true)
      expect(result.daysUntilExpiry).toBe(Infinity)
      expect(result.isNearExpiry).toBe(false)
    })
  })

  describe("CANCELLED status", () => {
    it("always returns CANCELLED canWrite=false regardless of expiry date (far future trial)", () => {
      const result = resolveSubscription(makeSub(30, "PRO", "CANCELLED", true))
      expect(result.status).toBe("CANCELLED")
      expect(result.canWrite).toBe(false)
      expect(result.isNearExpiry).toBe(false)
    })

    it("returns CANCELLED even when expiry is far in the past", () => {
      const result = resolveSubscription(makeSub(-60, "PRO", "CANCELLED", true))
      expect(result.status).toBe("CANCELLED")
      expect(result.canWrite).toBe(false)
    })
  })

  describe("ACTIVE — far from expiry (> 7 days)", () => {
    it("returns ACTIVE and canWrite=true at 30 days until trial expiry", () => {
      const result = resolveSubscription(makeSub(30))
      expect(result.status).toBe("ACTIVE")
      expect(result.canWrite).toBe(true)
      expect(result.isNearExpiry).toBe(false)
    })

    it("returns ACTIVE and not near-expiry at 8 days until expiry", () => {
      const result = resolveSubscription(makeSub(8))
      expect(result.status).toBe("ACTIVE")
      expect(result.canWrite).toBe(true)
      expect(result.isNearExpiry).toBe(false)
    })
  })

  describe("ACTIVE — near expiry (0 < days <= 7)", () => {
    it("returns ACTIVE with isNearExpiry=true at 7 days until expiry", () => {
      const result = resolveSubscription(makeSub(7))
      expect(result.status).toBe("ACTIVE")
      expect(result.canWrite).toBe(true)
      expect(result.isNearExpiry).toBe(true)
    })

    it("returns ACTIVE with isNearExpiry=true at 6 days until expiry", () => {
      const result = resolveSubscription(makeSub(6))
      expect(result.status).toBe("ACTIVE")
      expect(result.isNearExpiry).toBe(true)
    })

    it("returns ACTIVE with isNearExpiry=true at 1 day until expiry", () => {
      const result = resolveSubscription(makeSub(1))
      expect(result.status).toBe("ACTIVE")
      expect(result.isNearExpiry).toBe(true)
    })
  })

  describe("GRACE — 0 to <7 days past expiry", () => {
    it("returns GRACE at 0 days past expiry (just expired) with canWrite=true", () => {
      const result = resolveSubscription(makeSub(0))
      expect(result.status).toBe("GRACE")
      expect(result.canWrite).toBe(true)
    })

    it("returns GRACE at 3 days past expiry with graceDaysLeft > 0", () => {
      const result = resolveSubscription(makeSub(-3))
      expect(result.status).toBe("GRACE")
      expect(result.canWrite).toBe(true)
      expect(result.graceDaysLeft).toBeGreaterThan(0)
    })

    it("returns GRACE at 6 days past expiry with graceDaysLeft >= 1", () => {
      const result = resolveSubscription(makeSub(-6))
      expect(result.status).toBe("GRACE")
      expect(result.graceDaysLeft).toBeGreaterThanOrEqual(1)
    })
  })

  describe("LOCKED — 7+ days past expiry", () => {
    it("returns LOCKED at exactly 7 days past expiry with canWrite=false", () => {
      const result = resolveSubscription(makeSub(-7))
      expect(result.status).toBe("LOCKED")
      expect(result.canWrite).toBe(false)
      expect(result.graceDaysLeft).toBe(0)
    })

    it("returns LOCKED at 30 days past expiry", () => {
      const result = resolveSubscription(makeSub(-30))
      expect(result.status).toBe("LOCKED")
      expect(result.canWrite).toBe(false)
    })
  })

  describe("PRO and TEAM paid plans use currentPeriodEnd (isTrial=false)", () => {
    it("returns ACTIVE near-expiry for PRO paid plan with 5 days left on currentPeriodEnd", () => {
      const result = resolveSubscription(makeSub(5, "PRO", "ACTIVE", false))
      expect(result.status).toBe("ACTIVE")
      expect(result.isNearExpiry).toBe(true)
    })

    it("returns LOCKED for PRO plan with null currentPeriodEnd (no paid period set)", () => {
      const sub: RawSubscription = {
        id: "sub-2",
        plan: "PRO",
        status: "ACTIVE",
        isTrial: false,
        billingCycle: "MONTHLY",
        trialEndsAt: null,
        currentPeriodEnd: null,
      }
      const result = resolveSubscription(sub)
      expect(result.status).toBe("LOCKED")
      expect(result.canWrite).toBe(false)
    })

    it("returns LOCKED for TEAM plan 10 days past currentPeriodEnd", () => {
      const result = resolveSubscription(makeSub(-10, "TEAM", "ACTIVE", false))
      expect(result.status).toBe("LOCKED")
      expect(result.canWrite).toBe(false)
    })
  })
})

// ─── getEffectiveSubscription ─────────────────────────────────────────────────

vi.mock("@/lib/db", () => ({
  db: {
    subscription: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    aiUsageLog: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
    },
  },
}))

describe("getEffectiveSubscription", () => {
  let mockDb: {
    subscription: {
      findUnique: ReturnType<typeof vi.fn>
      update: ReturnType<typeof vi.fn>
    }
    aiUsageLog: {
      findUnique: ReturnType<typeof vi.fn>
      upsert: ReturnType<typeof vi.fn>
    }
  }

  beforeEach(async () => {
    const { db } = await import("@/lib/db")
    mockDb = db as unknown as typeof mockDb
    vi.clearAllMocks()
  })

  it("returns null when no subscription row exists", async () => {
    mockDb.subscription.findUnique.mockResolvedValue(null)
    const result = await getEffectiveSubscription("office-1")
    expect(result).toBeNull()
  })

  it("returns resolved state without DB update when stored status matches computed status", async () => {
    // PRO trial expires in 20 days → ACTIVE
    const futureDate = new Date()
    futureDate.setDate(futureDate.getDate() + 20)
    mockDb.subscription.findUnique.mockResolvedValue({
      id: "sub-1",
      plan: "PRO",
      status: "ACTIVE",
      isTrial: true,
      billingCycle: "MONTHLY",
      trialEndsAt: futureDate,
      currentPeriodEnd: null,
    })
    mockDb.subscription.update.mockResolvedValue({})

    const result = await getEffectiveSubscription("office-1")

    expect(result?.status).toBe("ACTIVE")
    expect(result?.canWrite).toBe(true)
    // Status matches → no update needed
    expect(mockDb.subscription.update).not.toHaveBeenCalled()
  })

  it("calls db.subscription.update when resolved status differs from stored status", async () => {
    // PRO trial expired 3 days ago → resolves to GRACE, but DB still says ACTIVE
    const pastDate = new Date()
    pastDate.setDate(pastDate.getDate() - 3)
    mockDb.subscription.findUnique.mockResolvedValue({
      id: "sub-2",
      plan: "PRO",
      status: "ACTIVE",
      isTrial: true,
      billingCycle: "MONTHLY",
      trialEndsAt: pastDate,
      currentPeriodEnd: null,
    })
    mockDb.subscription.update.mockResolvedValue({})

    const result = await getEffectiveSubscription("office-2")

    expect(result?.status).toBe("GRACE")
    expect(mockDb.subscription.update).toHaveBeenCalledWith({
      where: { id: "sub-2" },
      data: { status: "GRACE" },
    })
  })

  it("does NOT call db.subscription.update when stored status is CANCELLED", async () => {
    // Admin set CANCELLED — even though trial is in the future, respect the override
    const futureDate = new Date()
    futureDate.setDate(futureDate.getDate() + 15)
    mockDb.subscription.findUnique.mockResolvedValue({
      id: "sub-3",
      plan: "PRO",
      status: "CANCELLED",
      isTrial: true,
      billingCycle: "MONTHLY",
      trialEndsAt: futureDate,
      currentPeriodEnd: null,
    })

    const result = await getEffectiveSubscription("office-3")

    expect(result?.status).toBe("CANCELLED")
    expect(result?.canWrite).toBe(false)
    expect(mockDb.subscription.update).not.toHaveBeenCalled()
  })
})

// ─── PLAN_LIMITS constants ────────────────────────────────────────────────────

describe("PLAN_LIMITS", () => {
  it("FREE plan allows 1 user, 10 active files, 10 AI calls per month", () => {
    expect(PLAN_LIMITS.FREE.maxUsers).toBe(1)
    expect(PLAN_LIMITS.FREE.maxActiveFiles).toBe(10)
    expect(PLAN_LIMITS.FREE.maxAiPerMonth).toBe(10)
  })

  it("PRO plan allows 10 users and unlimited files, AI, and SMS", () => {
    expect(PLAN_LIMITS.PRO.maxUsers).toBe(10)
    expect(PLAN_LIMITS.PRO.maxActiveFiles).toBe(Infinity)
    expect(PLAN_LIMITS.PRO.maxAiPerMonth).toBe(Infinity)
    expect(PLAN_LIMITS.PRO.maxSmsPerMonth).toBe(Infinity)
  })

  it("TEAM plan has unlimited users, files, and AI", () => {
    expect(PLAN_LIMITS.TEAM.maxUsers).toBe(Infinity)
    expect(PLAN_LIMITS.TEAM.maxActiveFiles).toBe(Infinity)
    expect(PLAN_LIMITS.TEAM.maxAiPerMonth).toBe(Infinity)
  })
})

// ─── PLAN_FEATURES constants ──────────────────────────────────────────────────

describe("PLAN_FEATURES", () => {
  it("FREE plan disables bulk SMS, map enrichment, reports, and sets watermarkLinks=true", () => {
    expect(PLAN_FEATURES.FREE.hasBulkSms).toBe(false)
    expect(PLAN_FEATURES.FREE.hasMapEnrichment).toBe(false)
    expect(PLAN_FEATURES.FREE.hasReports).toBe(false)
    expect(PLAN_FEATURES.FREE.watermarkLinks).toBe(true)
  })

  it("PRO plan enables share SMS, bulk SMS, map enrichment, reports, and sets watermarkLinks=false", () => {
    expect(PLAN_FEATURES.PRO.hasShareSms).toBe(true)
    expect(PLAN_FEATURES.PRO.hasBulkSms).toBe(true)
    expect(PLAN_FEATURES.PRO.hasMapEnrichment).toBe(true)
    expect(PLAN_FEATURES.PRO.hasReports).toBe(true)
    expect(PLAN_FEATURES.PRO.watermarkLinks).toBe(false)
  })

  it("TEAM plan includes advanced analytics and multi-branch on top of PRO features", () => {
    expect(PLAN_FEATURES.TEAM.hasShareSms).toBe(true)
    expect(PLAN_FEATURES.TEAM.hasAdvancedAnalytics).toBe(true)
    expect(PLAN_FEATURES.TEAM.hasMultiBranch).toBe(true)
    expect(PLAN_FEATURES.TEAM.watermarkLinks).toBe(false)
  })
})

// ─── getCurrentShamsiMonth ────────────────────────────────────────────────────

describe("getCurrentShamsiMonth", () => {
  it("returns a 6-digit integer representing YYYYMM in Jalali calendar", () => {
    const result = getCurrentShamsiMonth()
    expect(typeof result).toBe("number")
    expect(result).toBeGreaterThan(140000)
    expect(result).toBeLessThan(149999)
    // Must be exactly 6 digits
    expect(String(result)).toHaveLength(6)
  })
})

// ─── AI usage helpers ─────────────────────────────────────────────────────────

describe("getAiUsageThisMonth", () => {
  let mockDb2: {
    aiUsageLog: {
      findUnique: ReturnType<typeof vi.fn>
      upsert: ReturnType<typeof vi.fn>
    }
  }

  beforeEach(async () => {
    const { db } = await import("@/lib/db")
    mockDb2 = db as unknown as typeof mockDb2
    vi.clearAllMocks()
  })

  it("returns 0 when no log row exists for the office this month", async () => {
    mockDb2.aiUsageLog.findUnique.mockResolvedValue(null)
    const result = await getAiUsageThisMonth("office-1")
    expect(result).toBe(0)
  })

  it("returns the stored count when a log row exists", async () => {
    mockDb2.aiUsageLog.findUnique.mockResolvedValue({ count: 7 })
    const result = await getAiUsageThisMonth("office-1")
    expect(result).toBe(7)
  })

  it("queries with the correct officeId and current Shamsi month", async () => {
    mockDb2.aiUsageLog.findUnique.mockResolvedValue(null)
    await getAiUsageThisMonth("office-42")
    const callArgs = mockDb2.aiUsageLog.findUnique.mock.calls[0][0]
    expect(callArgs.where.officeId_shamsiMonth.officeId).toBe("office-42")
    expect(callArgs.where.officeId_shamsiMonth.shamsiMonth).toBe(getCurrentShamsiMonth())
  })
})

describe("incrementAiUsage", () => {
  let mockDb2: {
    aiUsageLog: {
      findUnique: ReturnType<typeof vi.fn>
      upsert: ReturnType<typeof vi.fn>
    }
  }

  beforeEach(async () => {
    const { db } = await import("@/lib/db")
    mockDb2 = db as unknown as typeof mockDb2
    vi.clearAllMocks()
  })

  it("upserts the AI usage log row for the current month", async () => {
    mockDb2.aiUsageLog.upsert.mockResolvedValue({})
    await incrementAiUsage("office-1")
    expect(mockDb2.aiUsageLog.upsert).toHaveBeenCalledOnce()
    const args = mockDb2.aiUsageLog.upsert.mock.calls[0][0]
    expect(args.where.officeId_shamsiMonth.officeId).toBe("office-1")
    expect(args.create.count).toBe(1)
    expect(args.update.count).toEqual({ increment: 1 })
  })
})
