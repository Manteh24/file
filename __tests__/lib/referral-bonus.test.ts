import { describe, it, expect, vi, beforeEach } from "vitest"
import { computeBonusAmount, maybeCreateBonusPayout } from "@/lib/referral"
import { clearSettingsCache } from "@/lib/platform-settings"

// ─── Mocks ────────────────────────────────────────────────────────────────────
// Mock the platform-settings module so we control percent / cap / lifetime / mode.
vi.mock("@/lib/platform-settings", async () => {
  return {
    clearSettingsCache: vi.fn(),
    getZarinpalMode: vi.fn(async () => "production"),
    getReferralBonusPercent: vi.fn(async () => 25),
    getReferralBonusMaxToman: vi.fn(async () => 150_000),
    getReferralBonusLifetimeCap: vi.fn(async () => 10),
  }
})

// Mock @/lib/db so any incidental imports don't blow up.
vi.mock("@/lib/db", () => ({
  db: {},
}))

import * as platformSettings from "@/lib/platform-settings"

// ─── Helpers ──────────────────────────────────────────────────────────────────

type MockTx = {
  referral: { findUnique: ReturnType<typeof vi.fn> }
  referralCode: { findUnique: ReturnType<typeof vi.fn> }
  office: { findUnique: ReturnType<typeof vi.fn> }
  referralBonusPayout: {
    findUnique: ReturnType<typeof vi.fn>
    count: ReturnType<typeof vi.fn>
    create: ReturnType<typeof vi.fn>
  }
}

function makeTx(): MockTx {
  return {
    referral: { findUnique: vi.fn() },
    referralCode: { findUnique: vi.fn() },
    office: { findUnique: vi.fn() },
    referralBonusPayout: {
      findUnique: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
    },
  }
}

// PaymentRecord.amount is in Rials (Toman × 10). Tests pass Rials.
function makePayment(amountRials: number) {
  return {
    id: "pay-1",
    officeId: "referred-office-1",
    amount: amountRials,
    status: "VERIFIED" as const,
  }
}

// Configure a mock tx for the happy path: referred office has a referral, the code is
// office-owned + active, the referrer is alive, no prior bonus, lifetime cap not reached.
function wireHappyPath(tx: MockTx, capUsed = 0) {
  tx.referral.findUnique.mockResolvedValue({ referralCodeId: "code-1" })
  tx.referralCode.findUnique.mockResolvedValue({
    id: "code-1",
    officeId: "referrer-office-1",
    isActive: true,
  })
  tx.office.findUnique.mockResolvedValue({ deletedAt: null })
  tx.referralBonusPayout.findUnique.mockResolvedValue(null)
  tx.referralBonusPayout.count.mockResolvedValue(capUsed)
  tx.referralBonusPayout.create.mockImplementation(async ({ data }) => ({ id: "bonus-1", ...data }))
}

beforeEach(() => {
  vi.clearAllMocks()
  clearSettingsCache()
  // Reset settings to defaults
  vi.mocked(platformSettings.getZarinpalMode).mockResolvedValue("production")
  vi.mocked(platformSettings.getReferralBonusPercent).mockResolvedValue(25)
  vi.mocked(platformSettings.getReferralBonusMaxToman).mockResolvedValue(150_000)
  vi.mocked(platformSettings.getReferralBonusLifetimeCap).mockResolvedValue(10)
})

// ─── computeBonusAmount: pure math ────────────────────────────────────────────

describe("computeBonusAmount", () => {
  it("PRO MONTHLY (290k Toman) at 25% → 72,500 (under cap)", () => {
    expect(computeBonusAmount(290_000, 25, 150_000)).toBe(72_500)
  })

  it("PRO ANNUAL (2,900k Toman) at 25% → 150,000 (cap binds)", () => {
    expect(computeBonusAmount(2_900_000, 25, 150_000)).toBe(150_000)
  })

  it("TEAM MONTHLY (590k Toman) at 25% → 147,500 (under cap)", () => {
    expect(computeBonusAmount(590_000, 25, 150_000)).toBe(147_500)
  })

  it("TEAM ANNUAL (5,900k Toman) at 25% → 150,000 (cap binds)", () => {
    expect(computeBonusAmount(5_900_000, 25, 150_000)).toBe(150_000)
  })

  it("floors fractional results", () => {
    // 7 × 25% = 1.75 → floored to 1
    expect(computeBonusAmount(7, 25, 150_000)).toBe(1)
  })
})

// ─── maybeCreateBonusPayout: eligibility ──────────────────────────────────────

describe("maybeCreateBonusPayout — happy path", () => {
  it("creates a payout when all conditions hold (PRO MONTHLY)", async () => {
    const tx = makeTx()
    wireHappyPath(tx)

    const result = await maybeCreateBonusPayout({
      paymentRecord: makePayment(2_900_000), // 290_000 Toman in Rials
      tx: tx as any,
    })

    expect(result).not.toBeNull()
    expect(tx.referralBonusPayout.create).toHaveBeenCalledTimes(1)
    expect(tx.referralBonusPayout.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        referralCodeId: "code-1",
        referredOfficeId: "referred-office-1",
        paymentRecordId: "pay-1",
        amountToman: 72_500,
        paymentToman: 290_000,
        percentApplied: 25,
        capApplied: 150_000,
        status: "PENDING",
      }),
    })
  })

  it("snapshots current percent + cap so later setting changes don't rewrite history", async () => {
    const tx = makeTx()
    wireHappyPath(tx)
    vi.mocked(platformSettings.getReferralBonusPercent).mockResolvedValue(30)
    vi.mocked(platformSettings.getReferralBonusMaxToman).mockResolvedValue(200_000)

    await maybeCreateBonusPayout({
      paymentRecord: makePayment(2_900_000),
      tx: tx as any,
    })

    expect(tx.referralBonusPayout.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        amountToman: 87_000, // 290k × 30%
        percentApplied: 30,
        capApplied: 200_000,
      }),
    })
  })
})

describe("maybeCreateBonusPayout — eligibility skips", () => {
  it("returns null when payment status is not VERIFIED", async () => {
    const tx = makeTx()
    wireHappyPath(tx)

    const result = await maybeCreateBonusPayout({
      paymentRecord: { ...makePayment(2_900_000), status: "PENDING" },
      tx: tx as any,
    })

    expect(result).toBeNull()
    expect(tx.referralBonusPayout.create).not.toHaveBeenCalled()
  })

  it("returns null when ZARINPAL_MODE is sandbox", async () => {
    const tx = makeTx()
    wireHappyPath(tx)
    vi.mocked(platformSettings.getZarinpalMode).mockResolvedValue("sandbox")

    const result = await maybeCreateBonusPayout({
      paymentRecord: makePayment(2_900_000),
      tx: tx as any,
    })

    expect(result).toBeNull()
    expect(tx.referralBonusPayout.create).not.toHaveBeenCalled()
  })

  it("returns null when office has no Referral row", async () => {
    const tx = makeTx()
    wireHappyPath(tx)
    tx.referral.findUnique.mockResolvedValue(null)

    const result = await maybeCreateBonusPayout({
      paymentRecord: makePayment(2_900_000),
      tx: tx as any,
    })

    expect(result).toBeNull()
    expect(tx.referralBonusPayout.create).not.toHaveBeenCalled()
  })

  it("returns null for partner codes (officeId === null)", async () => {
    const tx = makeTx()
    wireHappyPath(tx)
    tx.referralCode.findUnique.mockResolvedValue({ id: "code-1", officeId: null, isActive: true })

    const result = await maybeCreateBonusPayout({
      paymentRecord: makePayment(2_900_000),
      tx: tx as any,
    })

    expect(result).toBeNull()
    expect(tx.referralBonusPayout.create).not.toHaveBeenCalled()
  })

  it("returns null when referral code is inactive", async () => {
    const tx = makeTx()
    wireHappyPath(tx)
    tx.referralCode.findUnique.mockResolvedValue({
      id: "code-1",
      officeId: "referrer-office-1",
      isActive: false,
    })

    const result = await maybeCreateBonusPayout({
      paymentRecord: makePayment(2_900_000),
      tx: tx as any,
    })

    expect(result).toBeNull()
    expect(tx.referralBonusPayout.create).not.toHaveBeenCalled()
  })

  it("returns null when referrer office is soft-deleted", async () => {
    const tx = makeTx()
    wireHappyPath(tx)
    tx.office.findUnique.mockResolvedValue({ deletedAt: new Date() })

    const result = await maybeCreateBonusPayout({
      paymentRecord: makePayment(2_900_000),
      tx: tx as any,
    })

    expect(result).toBeNull()
    expect(tx.referralBonusPayout.create).not.toHaveBeenCalled()
  })

  it("returns null when a bonus already exists for this referredOfficeId (idempotent)", async () => {
    const tx = makeTx()
    wireHappyPath(tx)
    tx.referralBonusPayout.findUnique.mockResolvedValue({ id: "existing-bonus" })

    const result = await maybeCreateBonusPayout({
      paymentRecord: makePayment(2_900_000),
      tx: tx as any,
    })

    expect(result).toBeNull()
    expect(tx.referralBonusPayout.create).not.toHaveBeenCalled()
  })

  it("returns null when referrer has hit lifetime cap", async () => {
    const tx = makeTx()
    wireHappyPath(tx, /* capUsed */ 10) // already 10 bonuses; cap is 10
    const result = await maybeCreateBonusPayout({
      paymentRecord: makePayment(2_900_000),
      tx: tx as any,
    })

    expect(result).toBeNull()
    expect(tx.referralBonusPayout.create).not.toHaveBeenCalled()
  })

  it("creates a payout when usedCount is exactly cap-1", async () => {
    const tx = makeTx()
    wireHappyPath(tx, /* capUsed */ 9) // 9 < 10 → still eligible

    const result = await maybeCreateBonusPayout({
      paymentRecord: makePayment(2_900_000),
      tx: tx as any,
    })

    expect(result).not.toBeNull()
    expect(tx.referralBonusPayout.create).toHaveBeenCalledTimes(1)
  })
})
