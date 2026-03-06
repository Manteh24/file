import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }))
vi.mock("@/lib/db", () => ({
  db: {
    referralCode: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    referral: { findMany: vi.fn() },
    subscription: { findMany: vi.fn() },
    paymentRecord: { findMany: vi.fn() },
    adminActionLog: { create: vi.fn() },
    adminOfficeAssignment: { findMany: vi.fn() },
    referralMonthlyEarning: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
      update: vi.fn(),
    },
  },
}))

import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { GET, POST } from "@/app/api/admin/referral-codes/route"

const mockAuth = auth as ReturnType<typeof vi.fn>
const mockDb = db as unknown as {
  referralCode: {
    findMany: ReturnType<typeof vi.fn>
    findUnique: ReturnType<typeof vi.fn>
    create: ReturnType<typeof vi.fn>
    update: ReturnType<typeof vi.fn>
  }
  referral: { findMany: ReturnType<typeof vi.fn> }
  subscription: { findMany: ReturnType<typeof vi.fn> }
  paymentRecord: { findMany: ReturnType<typeof vi.fn> }
  adminActionLog: { create: ReturnType<typeof vi.fn> }
  adminOfficeAssignment: { findMany: ReturnType<typeof vi.fn> }
  referralMonthlyEarning: { findUnique: ReturnType<typeof vi.fn>; upsert: ReturnType<typeof vi.fn>; update: ReturnType<typeof vi.fn> }
}

function makeReq(body?: unknown, params?: Record<string, string>) {
  const url = new URL("http://localhost/api/admin/referral-codes")
  if (params) {
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v))
  }
  return new Request(url.toString(), body ? {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  } : { method: "GET" })
}

beforeEach(() => {
  vi.clearAllMocks()
  mockDb.adminActionLog.create.mockResolvedValue({})
  mockDb.adminOfficeAssignment.findMany.mockResolvedValue([])
  mockDb.referral.findMany.mockResolvedValue([])
  mockDb.subscription.findMany.mockResolvedValue([])
  mockDb.paymentRecord.findMany.mockResolvedValue([])
})

describe("GET /api/admin/referral-codes", () => {
  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue(null)
    const res = await GET(makeReq())
    expect(res.status).toBe(401)
  })

  it("returns 403 for non-admin roles", async () => {
    mockAuth.mockResolvedValue({ user: { id: "u1", role: "MANAGER" } })
    const res = await GET(makeReq())
    expect(res.status).toBe(403)
  })

  it("returns list for SUPER_ADMIN", async () => {
    mockAuth.mockResolvedValue({ user: { id: "u1", role: "SUPER_ADMIN" } })
    mockDb.referralCode.findMany.mockResolvedValue([
      {
        id: "c1",
        code: "TEST01",
        label: "Test",
        officeId: null,
        office: null,
        commissionPerOfficePerMonth: 0,
        isActive: true,
        monthlyEarnings: [],
        _count: { referrals: 0 },
      },
    ])
    const res = await GET(makeReq())
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.success).toBe(true)
    expect(json.data).toHaveLength(1)
    expect(json.data[0].code).toBe("TEST01")
  })
})

describe("POST /api/admin/referral-codes", () => {
  it("returns 403 for MID_ADMIN (SUPER_ADMIN only)", async () => {
    mockAuth.mockResolvedValue({ user: { id: "u1", role: "MID_ADMIN" } })
    const res = await POST(makeReq({ label: "Test", commissionPerOfficePerMonth: 0 }))
    expect(res.status).toBe(403)
  })

  it("returns 400 when label is missing", async () => {
    mockAuth.mockResolvedValue({ user: { id: "u1", role: "SUPER_ADMIN" } })
    const res = await POST(makeReq({ commissionPerOfficePerMonth: 0 }))
    expect(res.status).toBe(400)
  })

  it("creates a partner code for SUPER_ADMIN", async () => {
    mockAuth.mockResolvedValue({ user: { id: "u1", role: "SUPER_ADMIN" } })
    mockDb.referralCode.findUnique.mockResolvedValue(null) // no collision
    mockDb.referralCode.create.mockResolvedValue({
      id: "c1",
      code: "PARTNER01",
      label: "شریک آزمایشی",
      commissionPerOfficePerMonth: 5000,
      isActive: true,
    })

    const res = await POST(
      makeReq({ label: "شریک آزمایشی", commissionPerOfficePerMonth: 5000, code: "PARTNER01" })
    )
    expect(res.status).toBe(201)
    const json = await res.json()
    expect(json.success).toBe(true)
    expect(json.data.code).toBe("PARTNER01")
  })

  it("returns 409 when code already exists", async () => {
    mockAuth.mockResolvedValue({ user: { id: "u1", role: "SUPER_ADMIN" } })
    mockDb.referralCode.findUnique.mockResolvedValue({ id: "existing" })

    const res = await POST(
      makeReq({ label: "Test", commissionPerOfficePerMonth: 0, code: "EXISTING" })
    )
    expect(res.status).toBe(409)
  })
})
