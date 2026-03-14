import { describe, it, expect, vi, beforeEach } from "vitest"

// ─── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock("@/lib/db", () => ({
  db: {
    subscription: {
      findMany: vi.fn(),
      update: vi.fn(),
    },
    notification: {
      findFirst: vi.fn(),
      create: vi.fn(),
    },
  },
}))

// Mock resolveSubscription so tests control what "effective" status is returned
vi.mock("@/lib/subscription", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/subscription")>()
  return {
    ...actual,
    resolveSubscription: vi.fn(),
  }
})

import { db } from "@/lib/db"
import { resolveSubscription } from "@/lib/subscription"
import { POST as lockExpiredTrials } from "@/app/api/cron/lock-expired-trials/route"

type MockFn = ReturnType<typeof vi.fn>

const mockDb = db as unknown as {
  subscription: { findMany: MockFn; update: MockFn }
  notification: { findFirst: MockFn; create: MockFn }
}

const mockResolveSubscription = resolveSubscription as unknown as MockFn

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
    vi.resetAllMocks()
    process.env.CRON_SECRET = CRON_SECRET
    // Default: no stale subscriptions and no active trials
    mockDb.subscription.findMany.mockResolvedValue([])
    mockDb.notification.findFirst.mockResolvedValue(null)
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

  it("returns 200 with zero counts when no subscriptions need processing", async () => {
    // Both findMany calls return empty
    mockDb.subscription.findMany.mockResolvedValue([])

    const res = await lockExpiredTrials(makeRequest(CRON_SECRET))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(body.data.statusSynced).toBe(0)
    expect(body.data.notificationsSent).toBe(0)
    // No updates or notification creation
    expect(mockDb.subscription.update).not.toHaveBeenCalled()
    expect(mockDb.notification.create).not.toHaveBeenCalled()
  })

  it("updates subscription status when stored status has drifted", async () => {
    // Pass 1 returns one stale sub; resolveSubscription returns GRACE but DB has ACTIVE
    const staleSub = {
      id: "sub-1",
      plan: "PRO",
      status: "ACTIVE",
      isTrial: true,
      billingCycle: "MONTHLY",
      trialEndsAt: new Date(Date.now() - 1000), // expired yesterday
      currentPeriodEnd: null,
    }
    mockDb.subscription.findMany
      .mockResolvedValueOnce([staleSub]) // pass 1: stale subs
      .mockResolvedValueOnce([])         // pass 2: active trials

    mockResolveSubscription.mockReturnValue({ status: "GRACE" })
    mockDb.subscription.update.mockResolvedValue({})

    const res = await lockExpiredTrials(makeRequest(CRON_SECRET))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data.statusSynced).toBe(1)

    expect(mockDb.subscription.update).toHaveBeenCalledWith({
      where: { id: "sub-1" },
      data: { status: "GRACE" },
    })
  })

  it("does not update subscription when status matches resolved status", async () => {
    const upToDateSub = {
      id: "sub-1",
      plan: "PRO",
      status: "ACTIVE",
      isTrial: true,
      billingCycle: "MONTHLY",
      trialEndsAt: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000), // 10 days left
      currentPeriodEnd: null,
    }
    mockDb.subscription.findMany
      .mockResolvedValueOnce([upToDateSub])
      .mockResolvedValueOnce([])

    // resolveSubscription returns same status
    mockResolveSubscription.mockReturnValue({ status: "ACTIVE" })

    const res = await lockExpiredTrials(makeRequest(CRON_SECRET))
    const body = await res.json()
    expect(body.data.statusSynced).toBe(0)
    expect(mockDb.subscription.update).not.toHaveBeenCalled()
  })

  it("creates TRIAL_REMINDER_14 notification for trial with 15-17 days left", async () => {
    const daysLeft = 16
    const trialEndsAt = new Date(Date.now() + daysLeft * 24 * 60 * 60 * 1000)
    const activeTrial = {
      id: "sub-2",
      plan: "PRO",
      status: "ACTIVE",
      isTrial: true,
      billingCycle: "MONTHLY",
      trialEndsAt,
      currentPeriodEnd: null,
      office: {
        users: [{ id: "manager-1" }],
      },
    }
    mockDb.subscription.findMany
      .mockResolvedValueOnce([])       // pass 1: no stale
      .mockResolvedValueOnce([activeTrial]) // pass 2: active trial

    mockDb.notification.findFirst.mockResolvedValue(null) // not yet sent
    mockDb.notification.create.mockResolvedValue({})

    const res = await lockExpiredTrials(makeRequest(CRON_SECRET))
    const body = await res.json()
    expect(body.data.notificationsSent).toBe(1)
    expect(mockDb.notification.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: "manager-1",
          type: "TRIAL_REMINDER_14",
        }),
      })
    )
  })

  it("creates TRIAL_REMINDER_23 notification for trial with 6-8 days left", async () => {
    const daysLeft = 7
    const trialEndsAt = new Date(Date.now() + daysLeft * 24 * 60 * 60 * 1000)
    const activeTrial = {
      id: "sub-3",
      plan: "PRO",
      status: "ACTIVE",
      isTrial: true,
      billingCycle: "MONTHLY",
      trialEndsAt,
      currentPeriodEnd: null,
      office: {
        users: [{ id: "manager-2" }],
      },
    }
    mockDb.subscription.findMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([activeTrial])

    mockDb.notification.findFirst.mockResolvedValue(null)
    mockDb.notification.create.mockResolvedValue({})

    const res = await lockExpiredTrials(makeRequest(CRON_SECRET))
    const body = await res.json()
    expect(body.data.notificationsSent).toBe(1)
    expect(mockDb.notification.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: "manager-2",
          type: "TRIAL_REMINDER_23",
        }),
      })
    )
  })

  it("does not create duplicate notifications (idempotent)", async () => {
    const daysLeft = 16
    const trialEndsAt = new Date(Date.now() + daysLeft * 24 * 60 * 60 * 1000)
    const activeTrial = {
      id: "sub-4",
      plan: "PRO",
      status: "ACTIVE",
      isTrial: true,
      billingCycle: "MONTHLY",
      trialEndsAt,
      currentPeriodEnd: null,
      office: { users: [{ id: "manager-3" }] },
    }
    mockDb.subscription.findMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([activeTrial])

    // Already sent — findFirst returns existing notification
    mockDb.notification.findFirst.mockResolvedValue({ id: "existing-notif" })

    const res = await lockExpiredTrials(makeRequest(CRON_SECRET))
    const body = await res.json()
    expect(body.data.notificationsSent).toBe(0)
    expect(mockDb.notification.create).not.toHaveBeenCalled()
  })

  it("skips trial if office has no active manager", async () => {
    const trialEndsAt = new Date(Date.now() + 16 * 24 * 60 * 60 * 1000)
    const activeTrial = {
      id: "sub-5",
      isTrial: true,
      status: "ACTIVE",
      trialEndsAt,
      office: { users: [] }, // no manager
    }
    mockDb.subscription.findMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([activeTrial])

    const res = await lockExpiredTrials(makeRequest(CRON_SECRET))
    const body = await res.json()
    expect(body.data.notificationsSent).toBe(0)
    expect(mockDb.notification.create).not.toHaveBeenCalled()
  })

  it("does NOT deactivate users — dynamic enforcement only", async () => {
    // Expired trial subscriptions should NOT trigger user deactivation
    const expiredSub = {
      id: "sub-6",
      plan: "PRO",
      status: "ACTIVE",
      isTrial: true,
      billingCycle: "MONTHLY",
      trialEndsAt: new Date(Date.now() - 1000),
      currentPeriodEnd: null,
    }
    mockDb.subscription.findMany
      .mockResolvedValueOnce([expiredSub])
      .mockResolvedValueOnce([])

    mockResolveSubscription.mockReturnValue({ status: "GRACE" })
    mockDb.subscription.update.mockResolvedValue({})

    await lockExpiredTrials(makeRequest(CRON_SECRET))

    // No user model access — users are never deactivated
    expect((db as unknown as { user?: { findMany?: MockFn } }).user?.findMany).toBeUndefined()
    expect((db as unknown as { user?: { updateMany?: MockFn } }).user?.updateMany).toBeUndefined()
  })
})
