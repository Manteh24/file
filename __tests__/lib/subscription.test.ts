import { describe, it, expect, vi, beforeEach } from "vitest"
import { resolveSubscription, getEffectiveSubscription } from "@/lib/subscription"
import type { RawSubscription } from "@/lib/subscription"

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Creates a RawSubscription with the expiry date shifted by `daysFromNow`.
 * Positive = future, negative = past.
 */
function makeSub(
  daysFromNow: number,
  plan: RawSubscription["plan"] = "TRIAL",
  status: RawSubscription["status"] = "ACTIVE"
): RawSubscription {
  const expiry = new Date()
  expiry.setTime(expiry.getTime() + daysFromNow * 24 * 60 * 60 * 1000)

  return {
    id: "sub-test-1",
    plan,
    status,
    trialEndsAt: plan === "TRIAL" ? expiry : new Date(0),
    currentPeriodEnd: plan !== "TRIAL" ? expiry : null,
  }
}

// ─── resolveSubscription ──────────────────────────────────────────────────────

describe("resolveSubscription", () => {
  describe("CANCELLED status", () => {
    it("always returns LOCKED canWrite=false regardless of expiry date (far future)", () => {
      const result = resolveSubscription(makeSub(30, "TRIAL", "CANCELLED"))
      expect(result.status).toBe("CANCELLED")
      expect(result.canWrite).toBe(false)
      expect(result.isNearExpiry).toBe(false)
    })

    it("returns CANCELLED even when expiry is far in the past", () => {
      const result = resolveSubscription(makeSub(-60, "TRIAL", "CANCELLED"))
      expect(result.status).toBe("CANCELLED")
      expect(result.canWrite).toBe(false)
    })
  })

  describe("ACTIVE — far from expiry (> 7 days)", () => {
    it("returns ACTIVE and canWrite=true at 30 days until expiry", () => {
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
      // 7 days exactly falls into the "> 0 and <= 7" bucket
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

  describe("SMALL and LARGE plans use currentPeriodEnd", () => {
    it("returns ACTIVE near-expiry for SMALL plan with 5 days left on currentPeriodEnd", () => {
      const result = resolveSubscription(makeSub(5, "SMALL"))
      expect(result.status).toBe("ACTIVE")
      expect(result.isNearExpiry).toBe(true)
    })

    it("returns LOCKED for SMALL plan with null currentPeriodEnd (no paid period set)", () => {
      const sub: RawSubscription = {
        id: "sub-2",
        plan: "SMALL",
        status: "ACTIVE",
        trialEndsAt: new Date(0),
        currentPeriodEnd: null,
      }
      const result = resolveSubscription(sub)
      expect(result.status).toBe("LOCKED")
      expect(result.canWrite).toBe(false)
    })

    it("returns LOCKED for LARGE plan 10 days past currentPeriodEnd", () => {
      const result = resolveSubscription(makeSub(-10, "LARGE"))
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
  },
}))

describe("getEffectiveSubscription", () => {
  let mockDb: {
    subscription: {
      findUnique: ReturnType<typeof vi.fn>
      update: ReturnType<typeof vi.fn>
    }
  }

  beforeEach(async () => {
    const { db } = await import("@/lib/db")
    mockDb = db as typeof mockDb
    vi.clearAllMocks()
  })

  it("returns null when no subscription row exists", async () => {
    mockDb.subscription.findUnique.mockResolvedValue(null)
    const result = await getEffectiveSubscription("office-1")
    expect(result).toBeNull()
  })

  it("returns resolved state without DB update when stored status matches computed status", async () => {
    // Trial expires in 20 days → ACTIVE
    const futureDate = new Date()
    futureDate.setDate(futureDate.getDate() + 20)
    mockDb.subscription.findUnique.mockResolvedValue({
      id: "sub-1",
      plan: "TRIAL",
      status: "ACTIVE",
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
    // Trial expired 3 days ago → resolves to GRACE, but DB still says ACTIVE
    const pastDate = new Date()
    pastDate.setDate(pastDate.getDate() - 3)
    mockDb.subscription.findUnique.mockResolvedValue({
      id: "sub-2",
      plan: "TRIAL",
      status: "ACTIVE",
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
      plan: "TRIAL",
      status: "CANCELLED",
      trialEndsAt: futureDate,
      currentPeriodEnd: null,
    })

    const result = await getEffectiveSubscription("office-3")

    expect(result?.status).toBe("CANCELLED")
    expect(result?.canWrite).toBe(false)
    expect(mockDb.subscription.update).not.toHaveBeenCalled()
  })
})
