import { describe, it, expect, vi, beforeEach } from "vitest"

// ─── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock("@/lib/db", () => ({
  db: {
    subscription: {
      findMany: vi.fn(),
    },
    user: {
      findMany: vi.fn(),
      updateMany: vi.fn(),
    },
  },
}))

import { db } from "@/lib/db"
import { POST as lockExpiredTrials } from "@/app/api/cron/lock-expired-trials/route"

type MockFn = ReturnType<typeof vi.fn>

const mockDb = db as unknown as {
  subscription: { findMany: MockFn }
  user: { findMany: MockFn; updateMany: MockFn }
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

function makeRequest(secret?: string): Request {
  const headers: Record<string, string> = {}
  if (secret !== undefined) {
    headers["x-cron-secret"] = secret
  }
  return new Request("http://localhost/api/cron/lock-expired-trials", {
    method: "POST",
    headers,
  })
}

// ─── Tests ─────────────────────────────────────────────────────────────────────

describe("POST /api/cron/lock-expired-trials", () => {
  const CRON_SECRET = "test-cron-secret-123"

  beforeEach(() => {
    vi.clearAllMocks()
    process.env.CRON_SECRET = CRON_SECRET
  })

  it("returns 401 when x-cron-secret header is missing", async () => {
    const res = await lockExpiredTrials(makeRequest())
    expect(res.status).toBe(401)
    const body = await res.json()
    expect(body.success).toBe(false)
  })

  it("returns 401 when x-cron-secret header is wrong", async () => {
    const res = await lockExpiredTrials(makeRequest("wrong-secret"))
    expect(res.status).toBe(401)
    const body = await res.json()
    expect(body.success).toBe(false)
  })

  it("returns 200 with processed=0 when no expired trials exist", async () => {
    mockDb.subscription.findMany.mockResolvedValue([])
    const res = await lockExpiredTrials(makeRequest(CRON_SECRET))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(body.data.processed).toBe(0)
    expect(body.data.usersLocked).toBe(0)
    // No user queries needed when no expired trials
    expect(mockDb.user.findMany).not.toHaveBeenCalled()
  })

  it("processes expired trials and locks users beyond index 1 (keep manager + first agent)", async () => {
    mockDb.subscription.findMany.mockResolvedValue([{ officeId: "office-1" }])
    // 4 active users — indices 0 and 1 are kept, indices 2 and 3 are locked
    mockDb.user.findMany.mockResolvedValue([
      { id: "user-manager" },
      { id: "user-agent-1" },
      { id: "user-agent-2" },
      { id: "user-agent-3" },
    ])
    mockDb.user.updateMany.mockResolvedValue({ count: 2 })

    const res = await lockExpiredTrials(makeRequest(CRON_SECRET))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(body.data.processed).toBe(1)
    expect(body.data.usersLocked).toBe(2)

    // Only users at index 2+ should be deactivated
    expect(mockDb.user.updateMany).toHaveBeenCalledWith({
      where: { id: { in: ["user-agent-2", "user-agent-3"] } },
      data: { isActive: false },
    })
  })

  it("does not call updateMany when office has 2 or fewer active users", async () => {
    mockDb.subscription.findMany.mockResolvedValue([{ officeId: "office-1" }])
    // Only 2 users — both are kept (slice(2) is empty)
    mockDb.user.findMany.mockResolvedValue([
      { id: "user-manager" },
      { id: "user-agent-1" },
    ])

    const res = await lockExpiredTrials(makeRequest(CRON_SECRET))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data.usersLocked).toBe(0)
    expect(mockDb.user.updateMany).not.toHaveBeenCalled()
  })

  it("processes multiple expired trial offices and sums usersLocked", async () => {
    mockDb.subscription.findMany.mockResolvedValue([
      { officeId: "office-1" },
      { officeId: "office-2" },
    ])
    // office-1: 3 users → lock 1; office-2: 4 users → lock 2
    mockDb.user.findMany
      .mockResolvedValueOnce([{ id: "u1" }, { id: "u2" }, { id: "u3" }])
      .mockResolvedValueOnce([{ id: "u4" }, { id: "u5" }, { id: "u6" }, { id: "u7" }])
    mockDb.user.updateMany.mockResolvedValue({ count: 1 })

    const res = await lockExpiredTrials(makeRequest(CRON_SECRET))
    const body = await res.json()
    expect(body.data.processed).toBe(2)
    expect(body.data.usersLocked).toBe(3) // 1 + 2
  })
})
