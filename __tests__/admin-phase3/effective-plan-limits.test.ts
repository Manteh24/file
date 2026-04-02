import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("@/lib/db", () => ({
  db: {
    platformSetting: { findUnique: vi.fn() },
  },
}))

import { db } from "@/lib/db"
import { clearSettingsCache } from "@/lib/platform-settings"
import { getEffectivePlanLimits, PLAN_LIMITS } from "@/lib/subscription"

const mockDb = db as unknown as {
  platformSetting: { findUnique: ReturnType<typeof vi.fn> }
}

beforeEach(() => {
  vi.resetAllMocks()
  clearSettingsCache()
})

describe("getEffectivePlanLimits", () => {
  it("returns hardcoded PRO limits without DB calls", async () => {
    const limits = await getEffectivePlanLimits("PRO")
    expect(limits.maxUsers).toBe(PLAN_LIMITS.PRO.maxUsers)
    expect(limits.maxActiveFiles).toBe(PLAN_LIMITS.PRO.maxActiveFiles)
    expect(mockDb.platformSetting.findUnique).not.toHaveBeenCalled()
  })

  it("returns hardcoded TEAM limits without DB calls", async () => {
    const limits = await getEffectivePlanLimits("TEAM")
    expect(limits.maxUsers).toBe(PLAN_LIMITS.TEAM.maxUsers)
    expect(mockDb.platformSetting.findUnique).not.toHaveBeenCalled()
  })

  it("reads FREE limits from settings when plan is FREE", async () => {
    mockDb.platformSetting.findUnique
      .mockResolvedValueOnce({ value: "2" })  // FREE_MAX_USERS
      .mockResolvedValueOnce({ value: "15" }) // FREE_MAX_FILES
      .mockResolvedValueOnce({ value: "5" })  // FREE_MAX_AI_MONTH
      .mockResolvedValueOnce({ value: "20" }) // FREE_MAX_SMS_MONTH
    const limits = await getEffectivePlanLimits("FREE")
    expect(limits.maxUsers).toBe(2)
    expect(limits.maxActiveFiles).toBe(15)
    expect(limits.maxAiPerMonth).toBe(5)
    expect(limits.maxSmsPerMonth).toBe(20)
  })

  it("uses defaults when FREE settings are not stored", async () => {
    mockDb.platformSetting.findUnique.mockResolvedValue(null)
    const limits = await getEffectivePlanLimits("FREE")
    expect(limits.maxUsers).toBe(1)
    expect(limits.maxActiveFiles).toBe(10)
    expect(limits.maxAiPerMonth).toBe(10)
    expect(limits.maxSmsPerMonth).toBe(30)
  })
})
