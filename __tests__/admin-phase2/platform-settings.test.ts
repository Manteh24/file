import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("@/lib/db", () => ({
  db: {
    platformSetting: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
    },
  },
}))

import { db } from "@/lib/db"
import { getSetting, setSetting, getTrialLengthDays, clearSettingsCache } from "@/lib/platform-settings"

const mockDb = db as unknown as {
  platformSetting: {
    findUnique: ReturnType<typeof vi.fn>
    upsert: ReturnType<typeof vi.fn>
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  clearSettingsCache()
})

describe("getSetting", () => {
  it("returns the stored value when found", async () => {
    mockDb.platformSetting.findUnique.mockResolvedValue({ key: "TRIAL_LENGTH_DAYS", value: "45" })
    const result = await getSetting("TRIAL_LENGTH_DAYS", "30")
    expect(result).toBe("45")
  })

  it("returns fallback when record is not found", async () => {
    mockDb.platformSetting.findUnique.mockResolvedValue(null)
    const result = await getSetting("TRIAL_LENGTH_DAYS", "30")
    expect(result).toBe("30")
  })
})

describe("setSetting", () => {
  it("upserts the setting with adminId", async () => {
    mockDb.platformSetting.upsert.mockResolvedValue({})
    await setSetting("TRIAL_LENGTH_DAYS", "60", "admin-1")
    expect(mockDb.platformSetting.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { key: "TRIAL_LENGTH_DAYS" },
        create: expect.objectContaining({ key: "TRIAL_LENGTH_DAYS", value: "60", updatedByAdminId: "admin-1" }),
        update: expect.objectContaining({ value: "60", updatedByAdminId: "admin-1" }),
      })
    )
  })
})

describe("getTrialLengthDays", () => {
  it("returns parsed int when value is valid", async () => {
    mockDb.platformSetting.findUnique.mockResolvedValue({ value: "45" })
    const days = await getTrialLengthDays()
    expect(days).toBe(45)
  })

  it("returns 30 when value is missing (null record)", async () => {
    mockDb.platformSetting.findUnique.mockResolvedValue(null)
    const days = await getTrialLengthDays()
    expect(days).toBe(30)
  })

  it("returns 30 when stored value is NaN", async () => {
    mockDb.platformSetting.findUnique.mockResolvedValue({ value: "abc" })
    const days = await getTrialLengthDays()
    expect(days).toBe(30)
  })

  it("returns 30 when stored value is 0 (below minimum)", async () => {
    mockDb.platformSetting.findUnique.mockResolvedValue({ value: "0" })
    const days = await getTrialLengthDays()
    expect(days).toBe(30)
  })
})
