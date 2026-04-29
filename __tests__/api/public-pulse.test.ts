import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("@/lib/db", () => ({
  db: {
    office: {
      count: vi.fn(),
      findMany: vi.fn(),
    },
    shareLink: {
      count: vi.fn(),
    },
  },
}))

import { db } from "@/lib/db"
import { GET as getPulse } from "@/app/api/public/pulse/route"

type MockFn = ReturnType<typeof vi.fn>
const mockDb = db as unknown as {
  office: { count: MockFn; findMany: MockFn }
  shareLink: { count: MockFn }
}

describe("GET /api/public/pulse", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("returns the four-key payload + cityNames without auth", async () => {
    mockDb.office.count.mockResolvedValue(42)
    mockDb.shareLink.count.mockResolvedValue(317)
    mockDb.office.findMany.mockResolvedValue([
      { city: "تهران" },
      { city: "اصفهان" },
      { city: "مشهد" },
    ])

    const res = await getPulse()
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.activeOffices).toBe(42)
    expect(body.filesSharedWeek).toBe(317)
    expect(body.cities).toBe(3)
    expect(body.cityNames).toEqual(["تهران", "اصفهان", "مشهد"])
    expect(typeof body.asOf).toBe("string")
  })

  it("filters out null city values from cityNames", async () => {
    mockDb.office.count.mockResolvedValue(10)
    mockDb.shareLink.count.mockResolvedValue(20)
    mockDb.office.findMany.mockResolvedValue([
      { city: "تهران" },
      { city: null },
      { city: "شیراز" },
    ])

    const res = await getPulse()
    const body = await res.json()
    expect(body.cityNames).toEqual(["تهران", "شیراز"])
    expect(body.cities).toBe(3) // count reflects raw distinct rows including any null
  })

  it("queries share links in the last 7 days", async () => {
    mockDb.office.count.mockResolvedValue(5)
    mockDb.shareLink.count.mockResolvedValue(0)
    mockDb.office.findMany.mockResolvedValue([])

    await getPulse()

    const where = mockDb.shareLink.count.mock.calls[0][0].where
    const gte: Date = where.createdAt.gte
    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000
    const drift = Math.abs(Date.now() - gte.getTime() - sevenDaysMs)
    expect(drift).toBeLessThan(2000)
  })

  it("excludes soft-deleted and locked-subscription offices from activeOffices", async () => {
    mockDb.office.count.mockResolvedValue(0)
    mockDb.shareLink.count.mockResolvedValue(0)
    mockDb.office.findMany.mockResolvedValue([])

    await getPulse()

    const where = mockDb.office.count.mock.calls[0][0].where
    expect(where.deletedAt).toBeNull()
    expect(where.subscription.status.not).toBe("LOCKED")
  })

  it("sets a 60s edge-cache header", async () => {
    mockDb.office.count.mockResolvedValue(1)
    mockDb.shareLink.count.mockResolvedValue(1)
    mockDb.office.findMany.mockResolvedValue([])

    const res = await getPulse()
    expect(res.headers.get("Cache-Control")).toContain("s-maxage=60")
  })
})
