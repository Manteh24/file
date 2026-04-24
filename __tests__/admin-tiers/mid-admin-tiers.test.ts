import { describe, it, expect, vi, beforeEach } from "vitest"

// ─── canAdminDo unit tests (pure function — no mocks needed) ─────────────────

import { canAdminDo } from "@/lib/admin"

describe("canAdminDo", () => {
  it("SUPER_ADMIN always returns true regardless of capability", () => {
    const user = { role: "SUPER_ADMIN" as const, adminTier: null }
    expect(canAdminDo(user, "manageSubscriptions")).toBe(true)
    expect(canAdminDo(user, "manageUsers")).toBe(true)
    expect(canAdminDo(user, "securityActions")).toBe(true)
    expect(canAdminDo(user, "broadcast")).toBe(true)
  })

  it("MID_ADMIN with null tier returns false for all capabilities", () => {
    const user = { role: "MID_ADMIN" as const, adminTier: null }
    expect(canAdminDo(user, "manageSubscriptions")).toBe(false)
    expect(canAdminDo(user, "manageUsers")).toBe(false)
    expect(canAdminDo(user, "securityActions")).toBe(false)
    expect(canAdminDo(user, "broadcast")).toBe(false)
  })

  it("SUPPORT tier: manageUsers + securityActions + broadcast = true, manageSubscriptions = false", () => {
    const user = { role: "MID_ADMIN" as const, adminTier: "SUPPORT" as const }
    expect(canAdminDo(user, "manageSubscriptions")).toBe(false)
    expect(canAdminDo(user, "manageUsers")).toBe(true)
    expect(canAdminDo(user, "securityActions")).toBe(true)
    expect(canAdminDo(user, "broadcast")).toBe(true)
  })

  it("FINANCE tier: manageSubscriptions + broadcast = true, manageUsers + securityActions = false", () => {
    const user = { role: "MID_ADMIN" as const, adminTier: "FINANCE" as const }
    expect(canAdminDo(user, "manageSubscriptions")).toBe(true)
    expect(canAdminDo(user, "manageUsers")).toBe(false)
    expect(canAdminDo(user, "securityActions")).toBe(false)
    expect(canAdminDo(user, "broadcast")).toBe(true)
  })

  it("FULL_ACCESS tier: all capabilities = true", () => {
    const user = { role: "MID_ADMIN" as const, adminTier: "FULL_ACCESS" as const }
    expect(canAdminDo(user, "manageSubscriptions")).toBe(true)
    expect(canAdminDo(user, "manageUsers")).toBe(true)
    expect(canAdminDo(user, "securityActions")).toBe(true)
    expect(canAdminDo(user, "broadcast")).toBe(true)
  })
})

// ─── Subscription PATCH: tier enforcement ────────────────────────────────────

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }))
vi.mock("@/lib/db", () => ({
  db: {
    subscription: { findUnique: vi.fn(), update: vi.fn() },
    adminOfficeAssignment: { findMany: vi.fn().mockResolvedValue([]) },
    adminAccessRule: { findMany: vi.fn().mockResolvedValue([]) },
    adminActionLog: { create: vi.fn() },
    user: { findFirst: vi.fn(), findUnique: vi.fn(), update: vi.fn() },
    userSession: { deleteMany: vi.fn() },
    adminBroadcast: { create: vi.fn() },
  },
}))
vi.mock("@/lib/notifications", () => ({ createManyNotifications: vi.fn().mockResolvedValue(undefined) }))
vi.mock("@/lib/sms", () => ({ sendSms: vi.fn().mockResolvedValue({ success: true }) }))

import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { PATCH as patchSubscription } from "@/app/api/admin/offices/[id]/subscription/route"
import { PATCH as patchUserActive } from "@/app/api/admin/users/[id]/active/route"
import { POST as postForceLogout } from "@/app/api/admin/users/[id]/force-logout/route"
import { POST as postBroadcast } from "@/app/api/admin/broadcast/route"
import { PATCH as patchTier } from "@/app/api/admin/mid-admins/[id]/route"

const mockAuth = auth as ReturnType<typeof vi.fn>
const mockDb = db as unknown as {
  subscription: { findUnique: ReturnType<typeof vi.fn>; update: ReturnType<typeof vi.fn> }
  adminOfficeAssignment: { findMany: ReturnType<typeof vi.fn> }
  adminAccessRule: { findMany: ReturnType<typeof vi.fn> }
  adminActionLog: { create: ReturnType<typeof vi.fn> }
  user: { findFirst: ReturnType<typeof vi.fn>; findUnique: ReturnType<typeof vi.fn>; update: ReturnType<typeof vi.fn> }
  userSession: { deleteMany: ReturnType<typeof vi.fn> }
  adminBroadcast: { create: ReturnType<typeof vi.fn> }
}

const officeId = "office-001"
const params = Promise.resolve({ id: officeId })
const userParams = Promise.resolve({ id: "user-001" })
const midAdminParams = Promise.resolve({ id: "midadmin-001" })

function makeSubscriptionReq() {
  return new Request("http://localhost/api/admin/offices/office-001/subscription", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status: "ACTIVE" }),
  })
}

function makeActiveReq(active: boolean) {
  return new Request("http://localhost/api/admin/users/user-001/active", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ active }),
  })
}

function makeForceLogoutReq() {
  return new Request("http://localhost/api/admin/users/user-001/force-logout", { method: "POST" })
}

function makeBroadcastReq() {
  return new Request("http://localhost/api/admin/broadcast", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ subject: "اطلاع‌رسانی", body: "متن پیام", targetType: "ALL", sendSms: false }),
  })
}

beforeEach(() => {
  vi.resetAllMocks()
  mockDb.adminOfficeAssignment.findMany.mockResolvedValue([{ officeId }])
  mockDb.adminAccessRule.findMany.mockResolvedValue([])
  mockDb.adminActionLog.create.mockResolvedValue({})
  mockDb.subscription.update.mockResolvedValue({})
  mockDb.user.update.mockResolvedValue({})
  mockDb.userSession.deleteMany.mockResolvedValue({ count: 1 })
  mockDb.adminBroadcast.create.mockResolvedValue({})
})

// ── subscription ─────────────────────────────────────────────────────────────

describe("PATCH /api/admin/offices/[id]/subscription — tier enforcement", () => {
  it("FINANCE tier → allowed (manageSubscriptions=true)", async () => {
    mockAuth.mockResolvedValue({ user: { id: "a1", role: "MID_ADMIN", adminTier: "FINANCE" } })
    mockDb.subscription.findUnique.mockResolvedValue({
      id: "sub-1",
      officeId,
      plan: "PRO",
      status: "ACTIVE",
      isTrial: false,
      trialEndsAt: null,
      currentPeriodEnd: null,
    })

    const res = await patchSubscription(makeSubscriptionReq(), { params })
    expect(res.status).toBe(200)
  })

  it("SUPPORT tier → 403 (manageSubscriptions=false)", async () => {
    mockAuth.mockResolvedValue({ user: { id: "a1", role: "MID_ADMIN", adminTier: "SUPPORT" } })

    const res = await patchSubscription(makeSubscriptionReq(), { params })
    expect(res.status).toBe(403)
  })

  it("null tier → 403 (read-only)", async () => {
    mockAuth.mockResolvedValue({ user: { id: "a1", role: "MID_ADMIN", adminTier: null } })

    const res = await patchSubscription(makeSubscriptionReq(), { params })
    expect(res.status).toBe(403)
  })

  it("FULL_ACCESS tier → allowed", async () => {
    mockAuth.mockResolvedValue({ user: { id: "a1", role: "MID_ADMIN", adminTier: "FULL_ACCESS" } })
    mockDb.subscription.findUnique.mockResolvedValue({
      id: "sub-1",
      officeId,
      plan: "PRO",
      status: "ACTIVE",
      isTrial: false,
      trialEndsAt: null,
      currentPeriodEnd: null,
    })

    const res = await patchSubscription(makeSubscriptionReq(), { params })
    expect(res.status).toBe(200)
  })
})

// ── user activation ───────────────────────────────────────────────────────────

describe("PATCH /api/admin/users/[id]/active — tier enforcement", () => {
  it("SUPPORT tier → allowed (manageUsers=true)", async () => {
    mockAuth.mockResolvedValue({ user: { id: "a1", role: "MID_ADMIN", adminTier: "SUPPORT" } })
    mockDb.user.findUnique.mockResolvedValue({ id: "user-001", officeId, role: "AGENT" })

    const res = await patchUserActive(makeActiveReq(false), { params: userParams })
    expect(res.status).toBe(200)
  })

  it("FINANCE tier → 403 (manageUsers=false)", async () => {
    mockAuth.mockResolvedValue({ user: { id: "a1", role: "MID_ADMIN", adminTier: "FINANCE" } })

    const res = await patchUserActive(makeActiveReq(false), { params: userParams })
    expect(res.status).toBe(403)
  })

  it("null tier → 403 (read-only)", async () => {
    mockAuth.mockResolvedValue({ user: { id: "a1", role: "MID_ADMIN", adminTier: null } })

    const res = await patchUserActive(makeActiveReq(false), { params: userParams })
    expect(res.status).toBe(403)
  })
})

// ── force logout ─────────────────────────────────────────────────────────────

describe("POST /api/admin/users/[id]/force-logout — tier enforcement", () => {
  it("SUPPORT tier → allowed (securityActions=true)", async () => {
    mockAuth.mockResolvedValue({ user: { id: "a1", role: "MID_ADMIN", adminTier: "SUPPORT" } })
    mockDb.user.findUnique.mockResolvedValue({ officeId })
    mockDb.userSession.deleteMany.mockResolvedValue({ count: 2 })

    const res = await postForceLogout(makeForceLogoutReq(), { params: userParams })
    expect(res.status).toBe(200)
  })

  it("FINANCE tier → 403 (securityActions=false)", async () => {
    mockAuth.mockResolvedValue({ user: { id: "a1", role: "MID_ADMIN", adminTier: "FINANCE" } })

    const res = await postForceLogout(makeForceLogoutReq(), { params: userParams })
    expect(res.status).toBe(403)
  })

  it("null tier → 403 (read-only)", async () => {
    mockAuth.mockResolvedValue({ user: { id: "a1", role: "MID_ADMIN", adminTier: null } })

    const res = await postForceLogout(makeForceLogoutReq(), { params: userParams })
    expect(res.status).toBe(403)
  })
})

// ── broadcast ─────────────────────────────────────────────────────────────────

describe("POST /api/admin/broadcast — tier enforcement", () => {
  beforeEach(() => {
    mockDb.user.findUnique.mockResolvedValue({ officeId, office: { phone: null } })
  })

  it("FINANCE tier → allowed (broadcast=true)", async () => {
    mockAuth.mockResolvedValue({ user: { id: "a1", role: "MID_ADMIN", adminTier: "FINANCE" } })
    // findMany used for managers query
    mockDb.user.findUnique.mockResolvedValue(undefined)
    // reuse db.user mock via the mock that broadcast route uses
    const mockDbCast = db as unknown as { user: { findMany: ReturnType<typeof vi.fn> } }
    mockDbCast.user.findMany = vi.fn().mockResolvedValue([])

    const res = await postBroadcast(makeBroadcastReq())
    expect(res.status).toBe(200)
  })

  it("null tier → 403 (broadcast=false)", async () => {
    mockAuth.mockResolvedValue({ user: { id: "a1", role: "MID_ADMIN", adminTier: null } })

    const res = await postBroadcast(makeBroadcastReq())
    expect(res.status).toBe(403)
  })

  it("SUPPORT tier → allowed (broadcast=true)", async () => {
    mockAuth.mockResolvedValue({ user: { id: "a1", role: "MID_ADMIN", adminTier: "SUPPORT" } })
    const mockDbCast = db as unknown as { user: { findMany: ReturnType<typeof vi.fn> } }
    mockDbCast.user.findMany = vi.fn().mockResolvedValue([])

    const res = await postBroadcast(makeBroadcastReq())
    expect(res.status).toBe(200)
  })
})

// ── tier update endpoint ──────────────────────────────────────────────────────

describe("PATCH /api/admin/mid-admins/[id] — tier update", () => {
  function makeTierReq(tier: string | null) {
    return new Request("http://localhost/api/admin/mid-admins/midadmin-001", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tier }),
    })
  }

  it("SUPER_ADMIN can update tier", async () => {
    mockAuth.mockResolvedValue({ user: { id: "super1", role: "SUPER_ADMIN", adminTier: null } })
    mockDb.user.findFirst.mockResolvedValue({ id: "midadmin-001", adminTier: null })

    const res = await patchTier(makeTierReq("FINANCE"), { params: midAdminParams })
    expect(res.status).toBe(200)
    expect(mockDb.user.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { adminTier: "FINANCE" } })
    )
  })

  it("MID_ADMIN cannot update tier → 403", async () => {
    mockAuth.mockResolvedValue({ user: { id: "mid1", role: "MID_ADMIN", adminTier: "FULL_ACCESS" } })

    const res = await patchTier(makeTierReq("FINANCE"), { params: midAdminParams })
    expect(res.status).toBe(403)
  })

  it("setting tier to null (read-only) is valid", async () => {
    mockAuth.mockResolvedValue({ user: { id: "super1", role: "SUPER_ADMIN", adminTier: null } })
    mockDb.user.findFirst.mockResolvedValue({ id: "midadmin-001", adminTier: "SUPPORT" })

    const res = await patchTier(makeTierReq(null), { params: midAdminParams })
    expect(res.status).toBe(200)
    expect(mockDb.user.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { adminTier: null } })
    )
  })

  it("target not found → 404", async () => {
    mockAuth.mockResolvedValue({ user: { id: "super1", role: "SUPER_ADMIN", adminTier: null } })
    mockDb.user.findFirst.mockResolvedValue(null)

    const res = await patchTier(makeTierReq("FINANCE"), { params: midAdminParams })
    expect(res.status).toBe(404)
  })

  it("invalid tier value → 400", async () => {
    mockAuth.mockResolvedValue({ user: { id: "super1", role: "SUPER_ADMIN", adminTier: null } })
    mockDb.user.findFirst.mockResolvedValue({ id: "midadmin-001", adminTier: null, email: null })

    const res = await patchTier(makeTierReq("INVALID_TIER"), { params: midAdminParams })
    expect(res.status).toBe(400)
  })
})
