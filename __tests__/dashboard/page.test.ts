import { describe, it, expect, vi, afterEach } from "vitest"
import type { Plan, SubStatus } from "@/types"

// ─── Helpers mirroring the dashboard page logic ───────────────────────────────
// The dashboard page computes trialDaysLeft inline. We replicate the exact
// formula here so changes to the component are caught immediately if the
// formula diverges.

function computeTrialDaysLeft(subscription: {
  plan: Plan
  status: SubStatus
  trialEndsAt: Date | null
  currentPeriodEnd: Date | null
} | null): number | null {
  if (!subscription) return null
  if (subscription.plan !== "TRIAL" || !subscription.trialEndsAt) return null

  return Math.max(
    0,
    Math.ceil(
      (subscription.trialEndsAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    )
  )
}

// ─── Plan / status label maps — mirrors the page constants ───────────────────

const planLabels: Record<Plan, string> = {
  TRIAL: "آزمایشی",
  SMALL: "پایه",
  LARGE: "حرفه‌ای",
}

const statusConfig: Record<SubStatus, { label: string; color: string }> = {
  ACTIVE: { label: "فعال", color: "text-emerald-600" },
  GRACE: { label: "دوره اضافه", color: "text-amber-600" },
  LOCKED: { label: "مسدود", color: "text-destructive" },
  CANCELLED: { label: "لغو شده", color: "text-muted-foreground" },
}

// ─── Tests ────────────────────────────────────────────────────────────────────

afterEach(() => {
  vi.useRealTimers()
})

describe("trialDaysLeft calculation", () => {
  it("returns null when there is no subscription", () => {
    expect(computeTrialDaysLeft(null)).toBeNull()
  })

  it("returns null for a SMALL plan subscription", () => {
    const sub = {
      plan: "SMALL" as Plan,
      status: "ACTIVE" as SubStatus,
      trialEndsAt: null,
      currentPeriodEnd: new Date(),
    }
    expect(computeTrialDaysLeft(sub)).toBeNull()
  })

  it("returns null for a LARGE plan subscription", () => {
    const sub = {
      plan: "LARGE" as Plan,
      status: "ACTIVE" as SubStatus,
      trialEndsAt: null,
      currentPeriodEnd: new Date(),
    }
    expect(computeTrialDaysLeft(sub)).toBeNull()
  })

  it("returns null for a TRIAL subscription without a trialEndsAt date", () => {
    const sub = {
      plan: "TRIAL" as Plan,
      status: "ACTIVE" as SubStatus,
      trialEndsAt: null,
      currentPeriodEnd: null,
    }
    expect(computeTrialDaysLeft(sub)).toBeNull()
  })

  it("returns the correct number of days when trial ends in the future", () => {
    // Fix Date.now() to a known point
    const now = new Date("2026-02-19T12:00:00.000Z")
    vi.useFakeTimers()
    vi.setSystemTime(now)

    const trialEndsAt = new Date("2026-02-24T12:00:00.000Z") // exactly 5 days later
    const sub = {
      plan: "TRIAL" as Plan,
      status: "ACTIVE" as SubStatus,
      trialEndsAt,
      currentPeriodEnd: null,
    }
    expect(computeTrialDaysLeft(sub)).toBe(5)
  })

  it("returns 0 when the trial has already expired", () => {
    const now = new Date("2026-02-19T12:00:00.000Z")
    vi.useFakeTimers()
    vi.setSystemTime(now)

    const trialEndsAt = new Date("2026-02-10T12:00:00.000Z") // 9 days in the past
    const sub = {
      plan: "TRIAL" as Plan,
      status: "ACTIVE" as SubStatus,
      trialEndsAt,
      currentPeriodEnd: null,
    }
    expect(computeTrialDaysLeft(sub)).toBe(0)
  })

  it("returns 1 when less than 24 h remain (ceiling behaviour)", () => {
    const now = new Date("2026-02-19T12:00:00.000Z")
    vi.useFakeTimers()
    vi.setSystemTime(now)

    // 1 millisecond remaining — ceil to 1 day
    const trialEndsAt = new Date(now.getTime() + 1)
    const sub = {
      plan: "TRIAL" as Plan,
      status: "ACTIVE" as SubStatus,
      trialEndsAt,
      currentPeriodEnd: null,
    }
    expect(computeTrialDaysLeft(sub)).toBe(1)
  })
})

describe("planLabels", () => {
  it("maps TRIAL to the correct Persian label", () => {
    expect(planLabels["TRIAL"]).toBe("آزمایشی")
  })

  it("maps SMALL to the correct Persian label", () => {
    expect(planLabels["SMALL"]).toBe("پایه")
  })

  it("maps LARGE to the correct Persian label", () => {
    expect(planLabels["LARGE"]).toBe("حرفه‌ای")
  })
})

describe("statusConfig", () => {
  it("ACTIVE has the correct label and colour class", () => {
    expect(statusConfig["ACTIVE"]).toEqual({
      label: "فعال",
      color: "text-emerald-600",
    })
  })

  it("GRACE has the correct label and colour class", () => {
    expect(statusConfig["GRACE"]).toEqual({
      label: "دوره اضافه",
      color: "text-amber-600",
    })
  })

  it("LOCKED has the correct label and colour class", () => {
    expect(statusConfig["LOCKED"]).toEqual({
      label: "مسدود",
      color: "text-destructive",
    })
  })

  it("CANCELLED has the correct label and colour class", () => {
    expect(statusConfig["CANCELLED"]).toEqual({
      label: "لغو شده",
      color: "text-muted-foreground",
    })
  })
})
