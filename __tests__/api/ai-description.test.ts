import { describe, it, expect, vi, beforeEach } from "vitest"

// ─── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }))

vi.mock("@/lib/ai", () => ({ generateDescription: vi.fn() }))

import { auth } from "@/lib/auth"
import { generateDescription } from "@/lib/ai"
import { POST as descriptionRoute } from "@/app/api/ai/description/route"

type MockFn = ReturnType<typeof vi.fn>

const mockAuth = auth as MockFn
const mockGenerate = generateDescription as MockFn

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
  tone: "neutral",
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
  tone: "optimistic",
}

// ─── Tests ─────────────────────────────────────────────────────────────────────

describe("POST /api/ai/description", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAuth.mockResolvedValue(session)
    mockGenerate.mockResolvedValue({
      success: true,
      description: "یک توضیحات خوب برای ملک",
      usedFallback: false,
    })
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
    const req = makePostRequest({ tone: "neutral" })
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
    const req = makePostRequest({ transactionType: "BARTER", tone: "neutral" })
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
    expect(toneArg).toBe("neutral")
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
    const tones = ["honest", "neutral", "optimistic"] as const
    for (const tone of tones) {
      const req = makePostRequest({ ...minimalPayload, tone })
      const res = await descriptionRoute(req)
      expect(res.status).toBe(200)
    }
  })
})
