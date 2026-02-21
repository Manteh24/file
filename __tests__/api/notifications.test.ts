import { describe, it, expect, vi, beforeEach } from "vitest"

// ─── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }))

vi.mock("@/lib/db", () => ({
  db: {
    notification: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
  },
}))

import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { GET as listNotifications } from "@/app/api/notifications/route"
import { PATCH as markOneRead } from "@/app/api/notifications/[id]/route"
import { PATCH as markAllRead } from "@/app/api/notifications/read-all/route"

type MockFn = ReturnType<typeof vi.fn>

const mockAuth = auth as MockFn
const mockDb = db as unknown as {
  notification: {
    findMany: MockFn
    findFirst: MockFn
    update: MockFn
    updateMany: MockFn
  }
}

const managerSession = {
  user: { id: "user-1", officeId: "office-1", role: "MANAGER" },
}

function makeCtx(id: string) {
  return { params: Promise.resolve({ id }) }
}

// ─── GET /api/notifications ────────────────────────────────────────────────────

describe("GET /api/notifications", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAuth.mockResolvedValue(managerSession)
  })

  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue(null)
    const res = await listNotifications()
    expect(res.status).toBe(401)
    const body = await res.json()
    expect(body.success).toBe(false)
  })

  it("returns empty array when user has no notifications", async () => {
    mockDb.notification.findMany.mockResolvedValue([])
    const res = await listNotifications()
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(body.data).toEqual([])
  })

  it("returns notifications ordered newest first", async () => {
    const fakeNotifications = [
      { id: "n-2", type: "FILE_EDITED", title: "ویرایش شد", message: "...", read: false, fileId: "f-1", createdAt: "2026-02-21T18:00:00Z" },
      { id: "n-1", type: "FILE_ASSIGNED", title: "تخصیص داده شد", message: "...", read: true, fileId: "f-1", createdAt: "2026-02-21T17:00:00Z" },
    ]
    mockDb.notification.findMany.mockResolvedValue(fakeNotifications)
    const res = await listNotifications()
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data).toHaveLength(2)
    expect(body.data[0].id).toBe("n-2")
  })

  it("queries only the current user's notifications", async () => {
    mockDb.notification.findMany.mockResolvedValue([])
    await listNotifications()
    expect(mockDb.notification.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: "user-1" } })
    )
  })
})

// ─── PATCH /api/notifications/[id] ────────────────────────────────────────────

describe("PATCH /api/notifications/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAuth.mockResolvedValue(managerSession)
    mockDb.notification.findFirst.mockResolvedValue({ id: "n-1" })
    mockDb.notification.update.mockResolvedValue({ id: "n-1", read: true })
  })

  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue(null)
    const req = new Request("http://localhost/api/notifications/n-1", { method: "PATCH" })
    const res = await markOneRead(req, makeCtx("n-1"))
    expect(res.status).toBe(401)
  })

  it("returns 404 when notification does not belong to the user", async () => {
    mockDb.notification.findFirst.mockResolvedValue(null)
    const req = new Request("http://localhost/api/notifications/n-999", { method: "PATCH" })
    const res = await markOneRead(req, makeCtx("n-999"))
    expect(res.status).toBe(404)
    const body = await res.json()
    expect(body.success).toBe(false)
  })

  it("marks the notification as read and returns 200", async () => {
    const req = new Request("http://localhost/api/notifications/n-1", { method: "PATCH" })
    const res = await markOneRead(req, makeCtx("n-1"))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(mockDb.notification.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "n-1" }, data: { read: true } })
    )
  })
})

// ─── PATCH /api/notifications/read-all ────────────────────────────────────────

describe("PATCH /api/notifications/read-all", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAuth.mockResolvedValue(managerSession)
    mockDb.notification.updateMany.mockResolvedValue({ count: 3 })
  })

  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue(null)
    const res = await markAllRead()
    expect(res.status).toBe(401)
  })

  it("marks all user notifications as read", async () => {
    const res = await markAllRead()
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(mockDb.notification.updateMany).toHaveBeenCalledWith({
      where: { userId: "user-1", read: false },
      data: { read: true },
    })
  })
})
