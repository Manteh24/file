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
import { clearSettingsCache } from "@/lib/platform-settings"
import { PATCH } from "@/app/api/admin/settings/route"

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

function makeReq(body: unknown) {
  return new Request("http://localhost/api/admin/settings", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
}

beforeEach(() => {
  vi.resetAllMocks()
  clearSettingsCache()
  mockDb.adminActionLog.create.mockResolvedValue({})
  mockDb.adminOfficeAssignment.findMany.mockResolvedValue([])
  mockDb.platformSetting.findUnique.mockResolvedValue(null)
  mockDb.platformSetting.upsert.mockResolvedValue({})
})

describe("PATCH /api/admin/settings — new keys", () => {
  it("accepts MAINTENANCE_MODE true", async () => {
    mockAuth.mockResolvedValue({ user: { id: "a1", role: "SUPER_ADMIN" } })
    const res = await PATCH(makeReq({ MAINTENANCE_MODE: "true" }))
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.data.MAINTENANCE_MODE).toBe("true")
  })

  it("rejects invalid MAINTENANCE_MODE value", async () => {
    mockAuth.mockResolvedValue({ user: { id: "a1", role: "SUPER_ADMIN" } })
    const res = await PATCH(makeReq({ MAINTENANCE_MODE: "yes" }))
    expect(res.status).toBe(400)
  })

  it("accepts ZARINPAL_MODE sandbox", async () => {
    mockAuth.mockResolvedValue({ user: { id: "a1", role: "SUPER_ADMIN" } })
    const res = await PATCH(makeReq({ ZARINPAL_MODE: "sandbox" }))
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.data.ZARINPAL_MODE).toBe("sandbox")
  })

  it("rejects invalid ZARINPAL_MODE", async () => {
    mockAuth.mockResolvedValue({ user: { id: "a1", role: "SUPER_ADMIN" } })
    const res = await PATCH(makeReq({ ZARINPAL_MODE: "staging" }))
    expect(res.status).toBe(400)
  })

  it("accepts valid AVALAI_MODEL", async () => {
    mockAuth.mockResolvedValue({ user: { id: "a1", role: "SUPER_ADMIN" } })
    const res = await PATCH(makeReq({ AVALAI_MODEL: "gpt-4o" }))
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.data.AVALAI_MODEL).toBe("gpt-4o")
  })

  it("rejects empty AVALAI_MODEL", async () => {
    mockAuth.mockResolvedValue({ user: { id: "a1", role: "SUPER_ADMIN" } })
    const res = await PATCH(makeReq({ AVALAI_MODEL: "" }))
    expect(res.status).toBe(400)
  })

  it("accepts valid FREE_MAX_FILES", async () => {
    mockAuth.mockResolvedValue({ user: { id: "a1", role: "SUPER_ADMIN" } })
    const res = await PATCH(makeReq({ FREE_MAX_FILES: "5" }))
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.data.FREE_MAX_FILES).toBe("5")
  })

  it("rejects negative FREE_MAX_USERS", async () => {
    mockAuth.mockResolvedValue({ user: { id: "a1", role: "SUPER_ADMIN" } })
    const res = await PATCH(makeReq({ FREE_MAX_USERS: "-1" }))
    expect(res.status).toBe(400)
  })

  it("accepts multiple settings in one PATCH", async () => {
    mockAuth.mockResolvedValue({ user: { id: "a1", role: "SUPER_ADMIN" } })
    const res = await PATCH(
      makeReq({
        MAINTENANCE_MODE: "false",
        ZARINPAL_MODE: "production",
        FREE_MAX_AI_MONTH: "20",
      })
    )
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.data.FREE_MAX_AI_MONTH).toBe("20")
  })
})
