import { describe, it, expect, vi, beforeEach } from "vitest"

// ─── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }))

vi.mock("@/lib/sms", () => ({ sendSms: vi.fn() }))

vi.mock("@/lib/rate-limit", () => ({ isRateLimited: vi.fn().mockReturnValue(false) }))

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
  PLAN_FEATURES: {
    FREE: { hasShareSms: true, hasBulkSms: false, hasMaps: true, hasMapEnrichment: false, hasReports: false, hasPdfExport: false, hasLinkTracking: false, hasCustomBranding: false, watermarkLinks: true },
    PRO: { hasShareSms: true, hasBulkSms: true, hasMaps: true, hasMapEnrichment: true, hasReports: true, hasPdfExport: true, hasLinkTracking: true, hasCustomBranding: true, watermarkLinks: false },
    TEAM: { hasShareSms: true, hasBulkSms: true, hasMaps: true, hasMapEnrichment: true, hasReports: true, hasPdfExport: true, hasLinkTracking: true, hasCustomBranding: true, watermarkLinks: false },
  },
  getEffectivePlanLimits: vi.fn().mockResolvedValue({ maxUsers: 10, maxActiveFiles: Infinity, maxAiPerMonth: Infinity, maxSmsPerMonth: Infinity }),
  getSmsUsageThisMonth: vi.fn().mockResolvedValue(0),
  incrementSmsUsage: vi.fn().mockResolvedValue(undefined),
}))

import { auth } from "@/lib/auth"
import { sendSms } from "@/lib/sms"
import { POST as sendSmsRoute } from "@/app/api/sms/send/route"

type MockFn = ReturnType<typeof vi.fn>

const mockAuth = auth as MockFn
const mockSendSms = sendSms as MockFn

// ─── Helpers ───────────────────────────────────────────────────────────────────

function makePostRequest(body?: unknown): Request {
  return new Request("http://localhost/api/sms/send", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
}

const managerSession = {
  user: { id: "user-1", officeId: "office-1", role: "MANAGER" },
}

// ─── Tests ─────────────────────────────────────────────────────────────────────

describe("POST /api/sms/send", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAuth.mockResolvedValue(managerSession)
    mockSendSms.mockResolvedValue({ success: true })
  })

  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue(null)
    const req = makePostRequest({ phone: "09123456789", message: "سلام", type: "share" })
    const res = await sendSmsRoute(req)
    expect(res.status).toBe(401)
    const body = await res.json()
    expect(body.success).toBe(false)
  })

  it("returns 400 for invalid JSON body", async () => {
    const req = new Request("http://localhost/api/sms/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "not-json",
    })
    const res = await sendSmsRoute(req)
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.success).toBe(false)
  })

  it("returns 400 for invalid phone number", async () => {
    const req = makePostRequest({ phone: "12345", message: "سلام", type: "share" })
    const res = await sendSmsRoute(req)
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.success).toBe(false)
    expect(body.error).toBeTruthy()
  })

  it("returns 400 for empty message", async () => {
    const req = makePostRequest({ phone: "09123456789", message: "", type: "share" })
    const res = await sendSmsRoute(req)
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.success).toBe(false)
  })

  it("returns 400 for message exceeding 500 characters", async () => {
    const req = makePostRequest({ phone: "09123456789", message: "ا".repeat(501), type: "share" })
    const res = await sendSmsRoute(req)
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.success).toBe(false)
  })

  it("returns 400 when type is missing", async () => {
    const req = makePostRequest({ phone: "09123456789", message: "سلام" })
    const res = await sendSmsRoute(req)
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.success).toBe(false)
  })

  it("returns 502 when KaveNegar returns an error", async () => {
    mockSendSms.mockResolvedValue({ success: false, error: "خطا در ارسال پیامک" })
    const req = makePostRequest({ phone: "09123456789", message: "سلام", type: "share" })
    const res = await sendSmsRoute(req)
    expect(res.status).toBe(502)
    const body = await res.json()
    expect(body.success).toBe(false)
    expect(body.error).toBe("خطا در ارسال پیامک")
  })

  it("returns 200 and calls sendSms with correct arguments on happy path (share)", async () => {
    const req = makePostRequest({ phone: "09123456789", message: "سلام دنیا", type: "share" })
    const res = await sendSmsRoute(req)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(body.data).toEqual({ sent: true })
    expect(mockSendSms).toHaveBeenCalledWith("09123456789", "سلام دنیا")
  })

  it("returns 200 and calls sendSms with correct arguments on happy path (bulk)", async () => {
    const req = makePostRequest({ phone: "09123456789", message: "سلام دنیا", type: "bulk" })
    const res = await sendSmsRoute(req)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(mockSendSms).toHaveBeenCalledWith("09123456789", "سلام دنیا")
  })

  it("works with 10-digit phone format (9XXXXXXXXX)", async () => {
    const req = makePostRequest({ phone: "9123456789", message: "سلام", type: "share" })
    const res = await sendSmsRoute(req)
    expect(res.status).toBe(200)
    expect(mockSendSms).toHaveBeenCalledWith("9123456789", "سلام")
  })
})
