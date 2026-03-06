import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }))
vi.mock("@/lib/db", () => ({
  db: {
    aiUsageLog: {
      findMany: vi.fn(),
    },
    adminOfficeAssignment: { findMany: vi.fn() },
  },
}))

import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { GET } from "@/app/api/admin/ai-usage/route"

const mockAuth = auth as ReturnType<typeof vi.fn>
const mockDb = db as unknown as {
  aiUsageLog: { findMany: ReturnType<typeof vi.fn> }
  adminOfficeAssignment: { findMany: ReturnType<typeof vi.fn> }
}

beforeEach(() => {
  vi.clearAllMocks()
  mockDb.adminOfficeAssignment.findMany.mockResolvedValue([])
})

describe("GET /api/admin/ai-usage", () => {
  it("returns 401 when unauthenticated", async () => {
    mockAuth.mockResolvedValue(null)
    const res = await GET(new Request("http://localhost/api/admin/ai-usage"))
    expect(res.status).toBe(401)
  })

  it("returns 403 for non-admin", async () => {
    mockAuth.mockResolvedValue({ user: { id: "u1", role: "MANAGER" } })
    const res = await GET(new Request("http://localhost/api/admin/ai-usage"))
    expect(res.status).toBe(403)
  })

  it("returns usage data for SUPER_ADMIN", async () => {
    mockAuth.mockResolvedValue({ user: { id: "a1", role: "SUPER_ADMIN" } })
    mockDb.aiUsageLog.findMany.mockResolvedValue([
      {
        officeId: "o1",
        count: 5,
        office: { id: "o1", name: "دفتر اول", subscription: { plan: "PRO", status: "ACTIVE" } },
      },
      {
        officeId: "o2",
        count: 12,
        office: { id: "o2", name: "دفتر دوم", subscription: { plan: "FREE", status: "ACTIVE" } },
      },
    ])
    const res = await GET(new Request("http://localhost/api/admin/ai-usage"))
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.success).toBe(true)
    expect(json.data.totalCalls).toBe(17)
    expect(json.data.entries).toHaveLength(2)
    // FREE office with 12 calls (>=10) should be at limit
    const freeEntry = json.data.entries.find((e: { officeId: string }) => e.officeId === "o2")
    expect(freeEntry.isAtFreeLimit).toBe(true)
  })

  it("marks anomalies for offices > 2x average", async () => {
    // avg = (1 + 1 + 100) / 3 = 34, 2x = 68. Office o3 with 100 > 68 → anomaly.
    mockAuth.mockResolvedValue({ user: { id: "a1", role: "SUPER_ADMIN" } })
    mockDb.aiUsageLog.findMany.mockResolvedValue([
      { officeId: "o1", count: 1, office: { id: "o1", name: "A", subscription: { plan: "PRO", status: "ACTIVE" } } },
      { officeId: "o2", count: 1, office: { id: "o2", name: "B", subscription: { plan: "PRO", status: "ACTIVE" } } },
      { officeId: "o3", count: 100, office: { id: "o3", name: "C", subscription: { plan: "PRO", status: "ACTIVE" } } },
    ])
    const res = await GET(new Request("http://localhost/api/admin/ai-usage"))
    const json = await res.json()
    expect(json.data.anomalies).toHaveLength(1)
    expect(json.data.anomalies[0].officeId).toBe("o3")
  })
})
