import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("@/lib/db", () => ({
  db: {
    referralCode: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
    referral: {
      findMany: vi.fn(),
    },
    subscription: {
      findMany: vi.fn(),
    },
    referralMonthlyEarning: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
    },
    referralMonthlyEarningOffice: {
      deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
      createMany: vi.fn().mockResolvedValue({ count: 0 }),
    },
  },
}))

import { db } from "@/lib/db"
import { generateReferralCode, findActiveReferredOffices, generateMonthlySnapshot } from "@/lib/referral"

const mockDb = db as unknown as {
  referralCode: { findUnique: ReturnType<typeof vi.fn>; create: ReturnType<typeof vi.fn> }
  referral: { findMany: ReturnType<typeof vi.fn> }
  subscription: { findMany: ReturnType<typeof vi.fn> }
  referralMonthlyEarning: { findUnique: ReturnType<typeof vi.fn>; upsert: ReturnType<typeof vi.fn> }
  referralMonthlyEarningOffice: { deleteMany: ReturnType<typeof vi.fn>; createMany: ReturnType<typeof vi.fn> }
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe("generateReferralCode", () => {
  it("returns an uppercase code with no collision", async () => {
    mockDb.referralCode.findUnique.mockResolvedValue(null)
    const code = await generateReferralCode("دفتر مرکزی")
    expect(typeof code).toBe("string")
    expect(code.length).toBeGreaterThan(0)
  })

  it("retries on collision and returns a unique code", async () => {
    // First attempt collides, second doesn't
    mockDb.referralCode.findUnique
      .mockResolvedValueOnce({ id: "existing" })
      .mockResolvedValue(null)
    const code = await generateReferralCode("Test Office")
    expect(code).toBeTruthy()
    expect(mockDb.referralCode.findUnique).toHaveBeenCalledTimes(2)
  })
})

describe("findActiveReferredOffices", () => {
  it("returns empty array when no referrals exist", async () => {
    mockDb.referral.findMany.mockResolvedValue([])
    const result = await findActiveReferredOffices("code-1")
    expect(result).toEqual([])
  })

  it("returns empty array when no qualifying subscriptions", async () => {
    mockDb.referral.findMany.mockResolvedValue([{ officeId: "off-1" }])
    mockDb.subscription.findMany.mockResolvedValue([]) // no paid subs
    const result = await findActiveReferredOffices("code-1")
    expect(result).toEqual([])
  })

  it("returns officeIds of offices with qualifying subscriptions (paid or valid trial)", async () => {
    mockDb.referral.findMany.mockResolvedValue([{ officeId: "off-1" }, { officeId: "off-2" }])
    // Only off-1 has a qualifying subscription (paid or valid trial)
    mockDb.subscription.findMany.mockResolvedValue([{ officeId: "off-1" }])
    const result = await findActiveReferredOffices("code-1")
    expect(result).toEqual(["off-1"])
  })
})

describe("generateMonthlySnapshot", () => {
  it("throws when already paid", async () => {
    mockDb.referralMonthlyEarning.findUnique.mockResolvedValue({ isPaid: true })
    await expect(generateMonthlySnapshot("code-1", "2026-03")).rejects.toThrow()
  })

  it("upserts earnings for new month", async () => {
    mockDb.referralMonthlyEarning.findUnique.mockResolvedValue(null)
    mockDb.referralCode.findUnique.mockResolvedValue({ id: "code-1", commissionPerOfficePerMonth: 100 })
    mockDb.referral.findMany.mockResolvedValue([{ officeId: "off-1" }])
    mockDb.subscription.findMany.mockResolvedValue([{ officeId: "off-1" }])
    mockDb.referralMonthlyEarning.upsert.mockResolvedValue({
      id: "earn-1",
      activeOfficeCount: 1,
      commissionAmount: 100n,
      isPaid: false,
    })

    const result = await generateMonthlySnapshot("code-1", "2026-03")
    expect(result.activeOfficeCount).toBe(1)
    expect(mockDb.referralMonthlyEarning.upsert).toHaveBeenCalledTimes(1)
  })

  it("throws when code is not found", async () => {
    mockDb.referralMonthlyEarning.findUnique.mockResolvedValue(null)
    mockDb.referralCode.findUnique.mockResolvedValue(null)
    await expect(generateMonthlySnapshot("code-999", "2026-03")).rejects.toThrow("کد ارجاع یافت نشد")
  })
})
