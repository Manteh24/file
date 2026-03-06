import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }))
vi.mock("bcryptjs", () => ({
  default: { hash: vi.fn().mockResolvedValue("hashed") },
}))
vi.mock("@/lib/sms", () => ({ sendSms: vi.fn().mockResolvedValue({ success: true }) }))
vi.mock("@/lib/db", () => ({
  db: {
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    userSession: {
      deleteMany: vi.fn(),
    },
    adminActionLog: { create: vi.fn() },
    adminOfficeAssignment: { findMany: vi.fn() },
    $transaction: vi.fn(),
  },
}))

import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { GET, PATCH } from "@/app/api/admin/users/[id]/route"
import { POST as forceLogout } from "@/app/api/admin/users/[id]/force-logout/route"
import { POST as resetPassword } from "@/app/api/admin/users/[id]/reset-password/route"

const mockAuth = auth as ReturnType<typeof vi.fn>
const mockDb = db as unknown as {
  user: { findUnique: ReturnType<typeof vi.fn>; update: ReturnType<typeof vi.fn> }
  userSession: { deleteMany: ReturnType<typeof vi.fn> }
  adminActionLog: { create: ReturnType<typeof vi.fn> }
  adminOfficeAssignment: { findMany: ReturnType<typeof vi.fn> }
  $transaction: ReturnType<typeof vi.fn>
}

function makeParams(id: string) {
  return Promise.resolve({ id })
}

function makeReq(body?: unknown) {
  return new Request("http://localhost/", {
    method: body ? "PATCH" : "GET",
    headers: body ? { "Content-Type": "application/json" } : {},
    body: body ? JSON.stringify(body) : undefined,
  })
}

beforeEach(() => {
  // resetAllMocks clears both call history AND the mockOnce queue
  vi.resetAllMocks()
  mockDb.adminActionLog.create.mockResolvedValue({})
  mockDb.adminOfficeAssignment.findMany.mockResolvedValue([])
})

describe("GET /api/admin/users/[id]", () => {
  it("returns 401 when unauthenticated", async () => {
    mockAuth.mockResolvedValue(null)
    const res = await GET(makeReq(), { params: makeParams("u1") })
    expect(res.status).toBe(401)
  })

  it("returns 404 when user not found", async () => {
    // SUPER_ADMIN: canAccessUser returns true without a DB call (accessibleIds === null)
    // so only one findUnique call happens — the main query
    mockAuth.mockResolvedValue({ user: { id: "a1", role: "SUPER_ADMIN" } })
    mockDb.user.findUnique.mockResolvedValue(null) // main query returns null
    const res = await GET(makeReq(), { params: makeParams("u1") })
    expect(res.status).toBe(404)
  })

  it("returns user detail for SUPER_ADMIN", async () => {
    mockAuth.mockResolvedValue({ user: { id: "a1", role: "SUPER_ADMIN" } })
    const userRecord = {
      id: "u1",
      username: "test",
      displayName: "تست",
      email: "t@t.com",
      role: "MANAGER",
      isActive: true,
      adminNote: null,
      createdAt: new Date(),
      office: { id: "o1", name: "دفتر", city: null },
      sessions: [],
    }
    mockDb.user.findUnique.mockResolvedValue(userRecord)
    const res = await GET(makeReq(), { params: makeParams("u1") })
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.success).toBe(true)
    expect(json.data.username).toBe("test")
  })
})

describe("PATCH /api/admin/users/[id]", () => {
  it("updates adminNote", async () => {
    mockAuth.mockResolvedValue({ user: { id: "a1", role: "SUPER_ADMIN" } })
    mockDb.user.findUnique.mockResolvedValue({ officeId: "o1" })
    mockDb.user.update.mockResolvedValue({ id: "u1", adminNote: "test note" })
    const res = await PATCH(makeReq({ adminNote: "test note" }), { params: makeParams("u1") })
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.success).toBe(true)
  })
})

describe("POST /api/admin/users/[id]/force-logout", () => {
  it("returns 401 when unauthenticated", async () => {
    mockAuth.mockResolvedValue(null)
    const res = await forceLogout(makeReq(), { params: makeParams("u1") })
    expect(res.status).toBe(401)
  })

  it("deletes sessions and returns count", async () => {
    mockAuth.mockResolvedValue({ user: { id: "a1", role: "SUPER_ADMIN" } })
    mockDb.user.findUnique.mockResolvedValue({ officeId: "o1" })
    mockDb.userSession.deleteMany.mockResolvedValue({ count: 2 })
    const res = await forceLogout(makeReq(), { params: makeParams("u1") })
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.success).toBe(true)
    expect(json.data.sessionsDeleted).toBe(2)
  })
})

describe("POST /api/admin/users/[id]/reset-password", () => {
  it("returns 404 when user not found", async () => {
    mockAuth.mockResolvedValue({ user: { id: "a1", role: "SUPER_ADMIN" } })
    mockDb.user.findUnique.mockResolvedValue(null)
    const res = await resetPassword(makeReq(), { params: makeParams("u1") })
    expect(res.status).toBe(404)
  })

  it("resets password and returns tempPassword", async () => {
    mockAuth.mockResolvedValue({ user: { id: "a1", role: "SUPER_ADMIN" } })
    mockDb.user.findUnique.mockResolvedValue({
      id: "u1",
      displayName: "تست",
      email: "t@t.com",
      officeId: "o1",
      office: { phone: null },
    })
    mockDb.$transaction.mockResolvedValue([{}, { count: 1 }])

    const res = await resetPassword(makeReq(), { params: makeParams("u1") })
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.success).toBe(true)
    expect(typeof json.data.tempPassword).toBe("string")
    expect(json.data.tempPassword.length).toBeGreaterThan(0)
  })
})
