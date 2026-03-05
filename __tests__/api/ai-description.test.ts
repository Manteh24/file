import { describe, it, expect, vi, beforeEach } from "vitest"

// ─── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }))

vi.mock("@/lib/ai", () => ({ generateDescription: vi.fn() }))

vi.mock("@/lib/subscription", () => ({
  getEffectiveSubscription: vi.fn().mockResolvedValue({
    plan: "PRO",
    status: "ACTIVE",
    canWrite: true,
    isTrial: true,
    billingCycle: "MONTHLY",
    daysUntilExpiry: Infinity,
    isNearExpiry: false,
    graceDaysLeft: 0,
  }),
  PLAN_LIMITS: {
    FREE: { maxUsers: 1, maxActiveFiles: 10, maxAiPerMonth: 10 },
    PRO: { maxUsers: 7, maxActiveFiles: Infinity, maxAiPerMonth: Infinity },
    TEAM: { maxUsers: Infinity, maxActiveFiles: Infinity, maxAiPerMonth: Infinity },
  },
  getAiUsageThisMonth: vi.fn().mockResolvedValue(0),
  incrementAiUsage: vi.fn().mockResolvedValue(undefined),
}))

import { auth } from "@/lib/auth"
import { generateDescription } from "@/lib/ai"
import {
  getEffectiveSubscription,
  getAiUsageThisMonth,
  incrementAiUsage,
} from "@/lib/subscription"
import { POST as descriptionRoute } from "@/app/api/ai/description/route"

type MockFn = ReturnType<typeof vi.fn>

const mockAuth = auth as MockFn
const mockGenerate = generateDescription as MockFn
const mockGetEffectiveSub = getEffectiveSubscription as MockFn
const mockGetAiUsage = getAiUsageThisMonth as MockFn
const mockIncrementAiUsage = incrementAiUsage as MockFn

// ─── Helpers ───────────────────────────────────────────────────────────────────

function makePostRequest(body?: unknown): Request {
  return new Request("http://localhost/api/ai/description", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
}

const session = { user: { id: "user-1", officeId: "office-1", role: "MANAGER" } }

const minimalPayload = {
  transactionType: "SALE",
  tone: "standard",
}

const fullPayload = {
  transactionType: "SALE",
  propertyType: "APARTMENT",
  area: 120,
  floorNumber: 3,
  totalFloors: 7,
  buildingAge: 5,
  salePrice: 5000000000,
  address: "خیابان ولیعصر",
  neighborhood: "جردن",
  hasElevator: true,
  hasParking: true,
  hasStorage: false,
  hasBalcony: true,
  hasSecurity: false,
  tone: "compelling",
}

// ─── Tests ─────────────────────────────────────────────────────────────────────

describe("POST /api/ai/description", () => {
  const proSub = {
    plan: "PRO",
    status: "ACTIVE",
    canWrite: true,
    isTrial: true,
    billingCycle: "MONTHLY",
    daysUntilExpiry: Infinity,
    isNearExpiry: false,
    graceDaysLeft: 0,
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockAuth.mockResolvedValue(session)
    mockGenerate.mockResolvedValue({
      success: true,
      description: "یک توضیحات خوب برای ملک",
      usedFallback: false,
    })
    // Reset subscription mocks to PRO defaults each test
    mockGetEffectiveSub.mockResolvedValue(proSub)
    mockGetAiUsage.mockResolvedValue(0)
    mockIncrementAiUsage.mockResolvedValue(undefined)
  })

  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue(null)
    const req = makePostRequest(minimalPayload)
    const res = await descriptionRoute(req)
    expect(res.status).toBe(401)
    const body = await res.json()
    expect(body.success).toBe(false)
  })

  it("returns 400 for invalid JSON body", async () => {
    const req = new Request("http://localhost/api/ai/description", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "not-json",
    })
    const res = await descriptionRoute(req)
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.success).toBe(false)
  })

  it("returns 400 when transactionType is missing", async () => {
    const req = makePostRequest({ tone: "standard" })
    const res = await descriptionRoute(req)
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.success).toBe(false)
  })

  it("returns 400 when tone is missing", async () => {
    const req = makePostRequest({ transactionType: "SALE" })
    const res = await descriptionRoute(req)
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.success).toBe(false)
  })

  it("returns 400 for invalid tone value", async () => {
    const req = makePostRequest({ ...minimalPayload, tone: "aggressive" })
    const res = await descriptionRoute(req)
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.success).toBe(false)
  })

  it("returns 400 for invalid transactionType", async () => {
    const req = makePostRequest({ transactionType: "BARTER", tone: "standard" })
    const res = await descriptionRoute(req)
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.success).toBe(false)
  })

  it("returns 200 with description on happy path (minimal payload)", async () => {
    const req = makePostRequest(minimalPayload)
    const res = await descriptionRoute(req)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(body.data.description).toBe("یک توضیحات خوب برای ملک")
  })

  it("returns 200 with description on happy path (full payload)", async () => {
    const req = makePostRequest(fullPayload)
    const res = await descriptionRoute(req)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(body.data.description).toBe("یک توضیحات خوب برای ملک")
  })

  it("calls generateDescription with correct tone and file data", async () => {
    const req = makePostRequest(minimalPayload)
    await descriptionRoute(req)
    expect(mockGenerate).toHaveBeenCalledOnce()
    const [inputArg, toneArg] = mockGenerate.mock.calls[0]
    expect(toneArg).toBe("standard")
    expect(inputArg).toMatchObject({ transactionType: "SALE" })
    // tone must not appear in the file data spread
    expect(inputArg).not.toHaveProperty("tone")
  })

  it("returns 500 when generateDescription returns success: false", async () => {
    mockGenerate.mockResolvedValue({ success: false, error: "خطای سرویس" })
    const req = makePostRequest(minimalPayload)
    const res = await descriptionRoute(req)
    expect(res.status).toBe(500)
    const body = await res.json()
    expect(body.success).toBe(false)
    expect(body.error).toBe("خطای سرویس")
  })

  it("returns the fallback description transparently (usedFallback = true)", async () => {
    mockGenerate.mockResolvedValue({
      success: true,
      description: "توضیحات قالب",
      usedFallback: true,
    })
    const req = makePostRequest(minimalPayload)
    const res = await descriptionRoute(req)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(body.data.description).toBe("توضیحات قالب")
  })

  it("accepts all valid tone values", async () => {
    const tones = ["formal", "standard", "compelling"] as const
    for (const tone of tones) {
      const req = makePostRequest({ ...minimalPayload, tone })
      const res = await descriptionRoute(req)
      expect(res.status).toBe(200)
    }
  })

  it("calls incrementAiUsage before generating description on success", async () => {
    const req = makePostRequest(minimalPayload)
    await descriptionRoute(req)
    expect(mockIncrementAiUsage).toHaveBeenCalledWith("office-1")
  })

  it("returns 403 when FREE plan has reached the 10/month AI limit", async () => {
    mockGetEffectiveSub.mockResolvedValue({
      plan: "FREE",
      status: "ACTIVE",
      canWrite: true,
      isTrial: false,
      billingCycle: "MONTHLY",
      daysUntilExpiry: Infinity,
      isNearExpiry: false,
      graceDaysLeft: 0,
    })
    mockGetAiUsage.mockResolvedValue(10) // at limit
    const req = makePostRequest(minimalPayload)
    const res = await descriptionRoute(req)
    expect(res.status).toBe(403)
    const body = await res.json()
    expect(body.success).toBe(false)
    expect(body.error).toContain("محدودیت")
  })

  it("returns 200 when FREE plan is under the 10/month limit", async () => {
    mockGetEffectiveSub.mockResolvedValue({
      plan: "FREE",
      status: "ACTIVE",
      canWrite: true,
      isTrial: false,
      billingCycle: "MONTHLY",
      daysUntilExpiry: Infinity,
      isNearExpiry: false,
      graceDaysLeft: 0,
    })
    mockGetAiUsage.mockResolvedValue(9) // one slot remaining
    const req = makePostRequest(minimalPayload)
    const res = await descriptionRoute(req)
    expect(res.status).toBe(200)
    expect(mockIncrementAiUsage).toHaveBeenCalledWith("office-1")
  })

  it("does not check AI usage count for PRO plan (Infinity limit)", async () => {
    // PRO is the default mock — getAiUsageThisMonth should NOT be called
    const req = makePostRequest(minimalPayload)
    await descriptionRoute(req)
    expect(mockGetAiUsage).not.toHaveBeenCalled()
  })
})
