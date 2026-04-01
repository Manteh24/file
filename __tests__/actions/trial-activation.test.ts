import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}))

vi.mock("@/lib/db", () => ({
  db: {
    subscription: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    user: {
      findFirst: vi.fn(),
    },
    trialPhone: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
    platformSetting: {
      findUnique: vi.fn().mockResolvedValue(null), // fallback 30 days
    },
    $transaction: vi.fn(),
  },
}))

import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { activateProTrial } from "@/lib/trial-activation"

const mockAuth = auth as ReturnType<typeof vi.fn>
const mockDb = db as unknown as {
  subscription: { findUnique: ReturnType<typeof vi.fn>; update: ReturnType<typeof vi.fn> }
  user: { findFirst: ReturnType<typeof vi.fn> }
  trialPhone: { findUnique: ReturnType<typeof vi.fn>; create: ReturnType<typeof vi.fn> }
  platformSetting: { findUnique: ReturnType<typeof vi.fn> }
  $transaction: ReturnType<typeof vi.fn>
}

const SESSION = { user: { officeId: "office-1", id: "user-1", role: "MANAGER" } }

beforeEach(() => {
  vi.clearAllMocks()
})

describe("activateProTrial", () => {
  it("returns unauthenticated when no session", async () => {
    mockAuth.mockResolvedValue(null)

    const result = await activateProTrial()
    expect(result.success).toBe(false)
    expect(result.reason).toBe("unauthenticated")
  })

  it("returns already_trial when isTrial=true", async () => {
    mockAuth.mockResolvedValue(SESSION)
    mockDb.subscription.findUnique.mockResolvedValue({ id: "sub-1", plan: "PRO", isTrial: true })
    mockDb.user.findFirst.mockResolvedValue({ phone: "09121234567" })

    const result = await activateProTrial()
    expect(result.success).toBe(false)
    expect(result.reason).toBe("already_trial")
  })

  it("returns already_paid when plan=PRO and isTrial=false", async () => {
    mockAuth.mockResolvedValue(SESSION)
    mockDb.subscription.findUnique.mockResolvedValue({ id: "sub-1", plan: "PRO", isTrial: false })
    mockDb.user.findFirst.mockResolvedValue({ phone: "09121234567" })

    const result = await activateProTrial()
    expect(result.success).toBe(false)
    expect(result.reason).toBe("already_paid")
  })

  it("returns already_paid when plan=TEAM and isTrial=false", async () => {
    mockAuth.mockResolvedValue(SESSION)
    mockDb.subscription.findUnique.mockResolvedValue({ id: "sub-1", plan: "TEAM", isTrial: false })
    mockDb.user.findFirst.mockResolvedValue({ phone: null })

    const result = await activateProTrial()
    expect(result.success).toBe(false)
    expect(result.reason).toBe("already_paid")
  })

  it("returns phone_used when TrialPhone exists for manager phone", async () => {
    mockAuth.mockResolvedValue(SESSION)
    mockDb.subscription.findUnique.mockResolvedValue({ id: "sub-1", plan: "FREE", isTrial: false })
    mockDb.user.findFirst.mockResolvedValue({ phone: "09121234567" })
    mockDb.trialPhone.findUnique.mockResolvedValue({ id: "tp-1" })

    const result = await activateProTrial()
    expect(result.success).toBe(false)
    expect(result.reason).toBe("phone_used")
  })

  it("activates PRO trial successfully — updates subscription and creates TrialPhone", async () => {
    mockAuth.mockResolvedValue(SESSION)
    mockDb.subscription.findUnique.mockResolvedValue({ id: "sub-1", plan: "FREE", isTrial: false })
    mockDb.user.findFirst.mockResolvedValue({ phone: "09121234567" })
    mockDb.trialPhone.findUnique.mockResolvedValue(null)
    mockDb.$transaction.mockResolvedValue(undefined)

    const result = await activateProTrial()
    expect(result.success).toBe(true)
    expect(mockDb.$transaction).toHaveBeenCalledTimes(1)
  })

  it("activates without TrialPhone record when manager has no phone", async () => {
    mockAuth.mockResolvedValue(SESSION)
    mockDb.subscription.findUnique.mockResolvedValue({ id: "sub-1", plan: "FREE", isTrial: false })
    mockDb.user.findFirst.mockResolvedValue({ phone: null })
    mockDb.$transaction.mockResolvedValue(undefined)

    const result = await activateProTrial()
    expect(result.success).toBe(true)
    expect(mockDb.$transaction).toHaveBeenCalledTimes(1)
    // trialPhone.findUnique should NOT have been called (no phone to check)
    expect(mockDb.trialPhone.findUnique).not.toHaveBeenCalled()
  })
})
