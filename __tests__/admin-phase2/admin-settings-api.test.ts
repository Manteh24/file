import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }))
vi.mock("@/lib/db", () => ({
  db: {
    platformSetting: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      upsert: vi.fn(),
    },
    adminActionLog: { create: vi.fn() },
    adminOfficeAssignment: { findMany: vi.fn() },
  },
}))

import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { GET, PATCH } from "@/app/api/admin/settings/route"

const mockAuth = auth as ReturnType<typeof vi.fn>
const mockDb = db as unknown as {
  platformSetting: {
    findMany: ReturnType<typeof vi.fn>
    findUnique: ReturnType<typeof vi.fn>
    upsert: ReturnType<typeof vi.fn>
  }
  adminActionLog: { create: ReturnType<typeof vi.fn> }
  adminOfficeAssignment: { findMany: ReturnType<typeof vi.fn> }
}

function makeReq(body?: unknown) {
  return new Request("http://localhost/api/admin/settings", {
    method: body ? "PATCH" : "GET",
    headers: body ? { "Content-Type": "application/json" } : {},
    body: body ? JSON.stringify(body) : undefined,
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  mockDb.adminActionLog.create.mockResolvedValue({})
  mockDb.adminOfficeAssignment.findMany.mockResolvedValue([])
})

describe("GET /api/admin/settings", () => {
  it("returns 401 when unauthenticated", async () => {
    mockAuth.mockResolvedValue(null)
    const res = await GET()
    expect(res.status).toBe(401)
  })

  it("returns 403 for MID_ADMIN (SUPER_ADMIN only)", async () => {
    mockAuth.mockResolvedValue({ user: { id: "a1", role: "MID_ADMIN" } })
    const res = await GET()
    expect(res.status).toBe(403)
  })

  it("returns all settings as key-value map", async () => {
    mockAuth.mockResolvedValue({ user: { id: "a1", role: "SUPER_ADMIN" } })
    mockDb.platformSetting.findMany.mockResolvedValue([
      { key: "TRIAL_LENGTH_DAYS", value: "30" },
    ])
    const res = await GET()
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.success).toBe(true)
    expect(json.data.TRIAL_LENGTH_DAYS).toBe("30")
  })
})

describe("PATCH /api/admin/settings", () => {
  it("returns 403 for non-SUPER_ADMIN", async () => {
    mockAuth.mockResolvedValue({ user: { id: "a1", role: "MID_ADMIN" } })
    const res = await PATCH(makeReq({ TRIAL_LENGTH_DAYS: "45" }))
    expect(res.status).toBe(403)
  })

  it("returns 400 for invalid trial days (out of range)", async () => {
    mockAuth.mockResolvedValue({ user: { id: "a1", role: "SUPER_ADMIN" } })
    const res = await PATCH(makeReq({ TRIAL_LENGTH_DAYS: "0" }))
    expect(res.status).toBe(400)
  })

  it("returns 400 for non-numeric trial days", async () => {
    mockAuth.mockResolvedValue({ user: { id: "a1", role: "SUPER_ADMIN" } })
    const res = await PATCH(makeReq({ TRIAL_LENGTH_DAYS: "abc" }))
    expect(res.status).toBe(400)
  })

  it("updates setting and returns updated values", async () => {
    mockAuth.mockResolvedValue({ user: { id: "a1", role: "SUPER_ADMIN" } })
    mockDb.platformSetting.findUnique.mockResolvedValue(null)
    mockDb.platformSetting.upsert.mockResolvedValue({ key: "TRIAL_LENGTH_DAYS", value: "45" })
    const res = await PATCH(makeReq({ TRIAL_LENGTH_DAYS: "45" }))
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.success).toBe(true)
    expect(json.data.TRIAL_LENGTH_DAYS).toBe("45")
  })
})
