import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }))
vi.mock("@/lib/db", () => ({
  db: {
    user: { findFirst: vi.fn() },
    adminLoginLog: { findMany: vi.fn() },
    adminOfficeAssignment: { findMany: vi.fn() },
  },
}))

import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { GET } from "@/app/api/admin/mid-admins/[id]/login-history/route"

const mockAuth = auth as ReturnType<typeof vi.fn>
const mockDb = db as unknown as {
  user: { findFirst: ReturnType<typeof vi.fn> }
  adminLoginLog: { findMany: ReturnType<typeof vi.fn> }
  adminOfficeAssignment: { findMany: ReturnType<typeof vi.fn> }
}

function makeParams(id: string) {
  return { params: Promise.resolve({ id }) }
}

beforeEach(() => {
  vi.resetAllMocks()
  mockDb.adminOfficeAssignment.findMany.mockResolvedValue([])
})

describe("GET /api/admin/mid-admins/[id]/login-history", () => {
  it("returns 401 when unauthenticated", async () => {
    mockAuth.mockResolvedValue(null)
    const res = await GET(new Request("http://localhost"), makeParams("u1"))
    expect(res.status).toBe(401)
  })

  it("returns 403 for MID_ADMIN (SUPER_ADMIN only)", async () => {
    mockAuth.mockResolvedValue({ user: { id: "a1", role: "MID_ADMIN" } })
    const res = await GET(new Request("http://localhost"), makeParams("u1"))
    expect(res.status).toBe(403)
  })

  it("returns 404 when target user is not a MID_ADMIN", async () => {
    mockAuth.mockResolvedValue({ user: { id: "a1", role: "SUPER_ADMIN" } })
    mockDb.user.findFirst.mockResolvedValue(null)
    const res = await GET(new Request("http://localhost"), makeParams("u1"))
    expect(res.status).toBe(404)
  })

  it("returns empty array when no login history exists", async () => {
    mockAuth.mockResolvedValue({ user: { id: "a1", role: "SUPER_ADMIN" } })
    mockDb.user.findFirst.mockResolvedValue({ id: "u1" })
    mockDb.adminLoginLog.findMany.mockResolvedValue([])
    const res = await GET(new Request("http://localhost"), makeParams("u1"))
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.success).toBe(true)
    expect(json.data).toEqual([])
  })

  it("returns login history with ip and userAgent", async () => {
    mockAuth.mockResolvedValue({ user: { id: "a1", role: "SUPER_ADMIN" } })
    mockDb.user.findFirst.mockResolvedValue({ id: "u1" })
    const loginAt = new Date("2026-03-06T10:00:00Z")
    mockDb.adminLoginLog.findMany.mockResolvedValue([
      { id: "log1", ipAddress: "1.2.3.4", userAgent: "Mozilla/5.0 Chrome/120", loginAt },
      { id: "log2", ipAddress: null, userAgent: null, loginAt },
    ])
    const res = await GET(new Request("http://localhost"), makeParams("u1"))
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.data).toHaveLength(2)
    expect(json.data[0].ipAddress).toBe("1.2.3.4")
    expect(json.data[1].ipAddress).toBeNull()
  })

  it("queries with adminId filter and take 15", async () => {
    mockAuth.mockResolvedValue({ user: { id: "a1", role: "SUPER_ADMIN" } })
    mockDb.user.findFirst.mockResolvedValue({ id: "u1" })
    mockDb.adminLoginLog.findMany.mockResolvedValue([])
    await GET(new Request("http://localhost"), makeParams("u1"))
    expect(mockDb.adminLoginLog.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { adminId: "u1" },
        take: 15,
        orderBy: { loginAt: "desc" },
      })
    )
  })
})
