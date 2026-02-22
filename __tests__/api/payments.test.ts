import { describe, it, expect, vi, beforeEach } from "vitest"

// ─── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }))

vi.mock("@/lib/db", () => ({
  db: {
    paymentRecord: {
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    subscription: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}))

vi.mock("@/lib/payment", () => ({
  requestPayment: vi.fn(),
  verifyPayment: vi.fn(),
  calculateNewPeriodEnd: vi.fn().mockReturnValue(new Date("2026-04-01")),
  PLAN_PRICES_RIALS: { SMALL: 4_900_000, LARGE: 9_900_000 },
}))

// Set NEXTAUTH_URL so the verify route builds absolute redirect URLs
process.env.NEXTAUTH_URL = "http://localhost:3000"

import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { requestPayment, verifyPayment } from "@/lib/payment"
import { POST as requestPaymentRoute } from "@/app/api/payments/request/route"
import { GET as verifyPaymentRoute } from "@/app/api/payments/verify/route"

type MockFn = ReturnType<typeof vi.fn>

const mockAuth = auth as MockFn
const mockDb = db as unknown as {
  paymentRecord: { create: MockFn; findUnique: MockFn; update: MockFn }
  subscription: { findUnique: MockFn; update: MockFn }
  $transaction: MockFn
}
const mockRequestPayment = requestPayment as MockFn
const mockVerifyPayment = verifyPayment as MockFn

const managerSession = {
  user: { id: "user-1", officeId: "office-1", role: "MANAGER" },
}
const agentSession = {
  user: { id: "user-2", officeId: "office-1", role: "AGENT" },
}

// ─── POST /api/payments/request ────────────────────────────────────────────────

describe("POST /api/payments/request", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAuth.mockResolvedValue(managerSession)
    mockRequestPayment.mockResolvedValue({
      success: true,
      authority: "A000000001234",
      payUrl: "https://www.zarinpal.com/pg/StartPay/A000000001234",
    })
    mockDb.paymentRecord.create.mockResolvedValue({ id: "pr-1" })
  })

  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue(null)
    const req = new Request("http://localhost/api/payments/request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plan: "SMALL" }),
    })
    const res = await requestPaymentRoute(req)
    expect(res.status).toBe(401)
  })

  it("returns 403 when authenticated as AGENT", async () => {
    mockAuth.mockResolvedValue(agentSession)
    const req = new Request("http://localhost/api/payments/request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plan: "SMALL" }),
    })
    const res = await requestPaymentRoute(req)
    expect(res.status).toBe(403)
  })

  it("returns 400 for invalid plan value", async () => {
    const req = new Request("http://localhost/api/payments/request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plan: "TRIAL" }),
    })
    const res = await requestPaymentRoute(req)
    expect(res.status).toBe(400)
  })

  it("returns 502 when Zarinpal returns an error", async () => {
    mockRequestPayment.mockResolvedValue({ success: false, error: "خطا در اتصال" })
    const req = new Request("http://localhost/api/payments/request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plan: "SMALL" }),
    })
    const res = await requestPaymentRoute(req)
    expect(res.status).toBe(502)
    const body = await res.json()
    expect(body.success).toBe(false)
  })

  it("creates a PaymentRecord with status PENDING on success", async () => {
    const req = new Request("http://localhost/api/payments/request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plan: "SMALL" }),
    })
    await requestPaymentRoute(req)
    expect(mockDb.paymentRecord.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          officeId: "office-1",
          plan: "SMALL",
          status: "PENDING",
          authority: "A000000001234",
        }),
      })
    )
  })

  it("returns payUrl and authority on success", async () => {
    const req = new Request("http://localhost/api/payments/request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plan: "LARGE" }),
    })
    const res = await requestPaymentRoute(req)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(body.data.payUrl).toContain("zarinpal.com")
    expect(body.data.authority).toBe("A000000001234")
  })
})

// ─── GET /api/payments/verify ──────────────────────────────────────────────────

describe("GET /api/payments/verify", () => {
  const pendingRecord = {
    id: "pr-1",
    officeId: "office-1",
    plan: "SMALL",
    amount: 4_900_000,
    status: "PENDING",
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockDb.paymentRecord.findUnique.mockResolvedValue(pendingRecord)
    mockDb.paymentRecord.update.mockResolvedValue({})
    mockDb.subscription.findUnique.mockResolvedValue({ currentPeriodEnd: null })
    mockDb.$transaction.mockResolvedValue([{}, {}])
    mockVerifyPayment.mockResolvedValue({ success: true, refId: "12345678", alreadyVerified: false })
  })

  function makeVerifyRequest(authority: string, status: string) {
    return new Request(
      `http://localhost/api/payments/verify?Authority=${authority}&Status=${status}`
    )
  }

  it("redirects to /settings?payment=cancelled when Status=NOK", async () => {
    const req = makeVerifyRequest("A000000001234", "NOK")
    const res = await verifyPaymentRoute(req)
    const location = res.headers.get("location")
    expect(location).toContain("payment=cancelled")
  })

  it("redirects to /settings?payment=error when authority not found in DB", async () => {
    mockDb.paymentRecord.findUnique.mockResolvedValue(null)
    const req = makeVerifyRequest("INVALID_AUTHORITY", "OK")
    const res = await verifyPaymentRoute(req)
    const location = res.headers.get("location")
    expect(location).toContain("payment=error")
  })

  it("redirects to /settings?payment=already_verified when record is already VERIFIED", async () => {
    mockDb.paymentRecord.findUnique.mockResolvedValue({ ...pendingRecord, status: "VERIFIED" })
    const req = makeVerifyRequest("A000000001234", "OK")
    const res = await verifyPaymentRoute(req)
    const location = res.headers.get("location")
    expect(location).toContain("payment=already_verified")
  })

  it("redirects to /settings?payment=failed when Zarinpal verify returns failure", async () => {
    mockVerifyPayment.mockResolvedValue({ success: false, error: "پرداخت تایید نشد" })
    const req = makeVerifyRequest("A000000001234", "OK")
    const res = await verifyPaymentRoute(req)
    const location = res.headers.get("location")
    expect(location).toContain("payment=failed")
  })

  it("calls $transaction with PaymentRecord update and Subscription update on success", async () => {
    const req = makeVerifyRequest("A000000001234", "OK")
    await verifyPaymentRoute(req)
    expect(mockDb.$transaction).toHaveBeenCalledTimes(1)
  })

  it("redirects to /settings?payment=success on happy path", async () => {
    const req = makeVerifyRequest("A000000001234", "OK")
    const res = await verifyPaymentRoute(req)
    const location = res.headers.get("location")
    expect(location).toContain("payment=success")
  })

  it("marks the PaymentRecord as FAILED when Zarinpal verify fails", async () => {
    mockVerifyPayment.mockResolvedValue({ success: false, error: "تایید نشد" })
    const req = makeVerifyRequest("A000000001234", "OK")
    await verifyPaymentRoute(req)
    expect(mockDb.paymentRecord.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { status: "FAILED" } })
    )
  })
})
