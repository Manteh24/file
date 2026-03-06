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
import {
  clearSettingsCache,
  isMaintenanceModeEnabled,
  getZarinpalMode,
  getAvalAiModel,
  getFreePlanLimits,
} from "@/lib/platform-settings"

const mockDb = db as unknown as {
  platformSetting: {
    findUnique: ReturnType<typeof vi.fn>
    upsert: ReturnType<typeof vi.fn>
  }
}

beforeEach(() => {
  vi.resetAllMocks()
  clearSettingsCache()
})

describe("isMaintenanceModeEnabled", () => {
  it("returns false when not set", async () => {
    mockDb.platformSetting.findUnique.mockResolvedValue(null)
    expect(await isMaintenanceModeEnabled()).toBe(false)
  })

  it("returns false when set to 'false'", async () => {
    mockDb.platformSetting.findUnique.mockResolvedValue({ value: "false" })
    expect(await isMaintenanceModeEnabled()).toBe(false)
  })

  it("returns true when set to 'true'", async () => {
    mockDb.platformSetting.findUnique.mockResolvedValue({ value: "true" })
    expect(await isMaintenanceModeEnabled()).toBe(true)
  })
})

describe("getZarinpalMode", () => {
  it("returns 'production' by default", async () => {
    mockDb.platformSetting.findUnique.mockResolvedValue(null)
    expect(await getZarinpalMode()).toBe("production")
  })

  it("returns 'sandbox' when configured", async () => {
    mockDb.platformSetting.findUnique.mockResolvedValue({ value: "sandbox" })
    expect(await getZarinpalMode()).toBe("sandbox")
  })

  it("returns 'production' for unexpected values", async () => {
    mockDb.platformSetting.findUnique.mockResolvedValue({ value: "staging" })
    expect(await getZarinpalMode()).toBe("production")
  })
})

describe("getAvalAiModel", () => {
  it("returns 'gpt-4o-mini' by default", async () => {
    mockDb.platformSetting.findUnique.mockResolvedValue(null)
    expect(await getAvalAiModel()).toBe("gpt-4o-mini")
  })

  it("returns stored model name", async () => {
    mockDb.platformSetting.findUnique.mockResolvedValue({ value: "gpt-4o" })
    expect(await getAvalAiModel()).toBe("gpt-4o")
  })
})

describe("getFreePlanLimits", () => {
  it("returns defaults when nothing is stored", async () => {
    mockDb.platformSetting.findUnique.mockResolvedValue(null)
    const limits = await getFreePlanLimits()
    expect(limits).toEqual({ maxUsers: 1, maxActiveFiles: 10, maxAiPerMonth: 10 })
  })

  it("returns custom limits when stored", async () => {
    mockDb.platformSetting.findUnique
      .mockResolvedValueOnce({ value: "3" })  // FREE_MAX_USERS
      .mockResolvedValueOnce({ value: "5" })  // FREE_MAX_FILES
      .mockResolvedValueOnce({ value: "20" }) // FREE_MAX_AI_MONTH
    const limits = await getFreePlanLimits()
    expect(limits.maxUsers).toBe(3)
    expect(limits.maxActiveFiles).toBe(5)
    expect(limits.maxAiPerMonth).toBe(20)
  })

  it("falls back to default for invalid values", async () => {
    mockDb.platformSetting.findUnique.mockResolvedValue({ value: "abc" })
    const limits = await getFreePlanLimits()
    expect(limits.maxUsers).toBe(1)
  })
})
