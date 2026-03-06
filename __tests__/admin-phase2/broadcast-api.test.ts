import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }))
vi.mock("@/lib/notifications", () => ({
  createManyNotifications: vi.fn().mockResolvedValue(undefined),
}))
vi.mock("@/lib/sms", () => ({ sendSms: vi.fn().mockResolvedValue({ success: true }) }))
vi.mock("@/lib/db", () => ({
  db: {
    user: { findMany: vi.fn() },
    adminBroadcast: { create: vi.fn(), findMany: vi.fn(), count: vi.fn() },
    adminOfficeAssignment: { findMany: vi.fn() },
  },
}))

import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { POST, GET } from "@/app/api/admin/broadcast/route"

const mockAuth = auth as ReturnType<typeof vi.fn>
const mockDb = db as unknown as {
  user: { findMany: ReturnType<typeof vi.fn> }
  adminBroadcast: { create: ReturnType<typeof vi.fn>; findMany: ReturnType<typeof vi.fn>; count: ReturnType<typeof vi.fn> }
  adminOfficeAssignment: { findMany: ReturnType<typeof vi.fn> }
}

function makeReq(body: unknown) {
  return new Request("http://localhost/api/admin/broadcast", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  mockDb.adminOfficeAssignment.findMany.mockResolvedValue([])
  mockDb.adminBroadcast.create.mockResolvedValue({})
  mockDb.adminBroadcast.count.mockResolvedValue(0)
  mockDb.adminBroadcast.findMany.mockResolvedValue([])
})

describe("POST /api/admin/broadcast", () => {
  it("returns 401 when unauthenticated", async () => {
    mockAuth.mockResolvedValue(null)
    const res = await POST(makeReq({ subject: "test", body: "msg", targetType: "ALL" }))
    expect(res.status).toBe(401)
  })

  it("returns 403 for non-admin", async () => {
    mockAuth.mockResolvedValue({ user: { id: "u1", role: "MANAGER" } })
    const res = await POST(makeReq({ subject: "test", body: "msg", targetType: "ALL" }))
    expect(res.status).toBe(403)
  })

  it("returns 400 when required fields missing", async () => {
    mockAuth.mockResolvedValue({ user: { id: "a1", role: "SUPER_ADMIN" } })
    const res = await POST(makeReq({ subject: "", body: "msg", targetType: "ALL" }))
    expect(res.status).toBe(400)
  })

  it("broadcasts to all managers and returns recipientCount", async () => {
    mockAuth.mockResolvedValue({ user: { id: "a1", role: "SUPER_ADMIN" } })
    mockDb.user.findMany.mockResolvedValue([
      { id: "m1", office: { phone: null } },
      { id: "m2", office: { phone: null } },
    ])

    const res = await POST(makeReq({ subject: "موضوع", body: "متن پیام", targetType: "ALL" }))
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.success).toBe(true)
    expect(json.data.recipientCount).toBe(2)
  })

  it("returns 400 when ONE target type missing officeId", async () => {
    mockAuth.mockResolvedValue({ user: { id: "a1", role: "SUPER_ADMIN" } })
    const res = await POST(makeReq({ subject: "موضوع", body: "متن", targetType: "ONE" }))
    expect(res.status).toBe(400)
  })
})

describe("GET /api/admin/broadcast", () => {
  it("returns broadcast history for admins", async () => {
    mockAuth.mockResolvedValue({ user: { id: "a1", role: "SUPER_ADMIN" } })
    mockDb.adminBroadcast.count.mockResolvedValue(1)
    mockDb.adminBroadcast.findMany.mockResolvedValue([
      {
        id: "b1",
        subject: "موضوع",
        body: "متن",
        targetType: "ALL",
        recipientCount: 5,
        sendSms: false,
        sentAt: new Date(),
        sentByAdmin: { displayName: "ادمین" },
      },
    ])
    const res = await GET(new Request("http://localhost/api/admin/broadcast"))
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.success).toBe(true)
    expect(json.data.broadcasts).toHaveLength(1)
  })
})
