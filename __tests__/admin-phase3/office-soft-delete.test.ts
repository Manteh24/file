import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }))
vi.mock("@/lib/db", () => ({
  db: {
    office: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    adminActionLog: { create: vi.fn() },
    adminOfficeAssignment: { findMany: vi.fn() },
  },
}))

import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { POST as archivePost } from "@/app/api/admin/offices/[id]/archive/route"
import { POST as restorePost } from "@/app/api/admin/offices/[id]/restore/route"

const mockAuth = auth as ReturnType<typeof vi.fn>
const mockDb = db as unknown as {
  office: {
    findUnique: ReturnType<typeof vi.fn>
    update: ReturnType<typeof vi.fn>
  }
  adminActionLog: { create: ReturnType<typeof vi.fn> }
  adminOfficeAssignment: { findMany: ReturnType<typeof vi.fn> }
}

function makeParams(id: string) {
  return { params: Promise.resolve({ id }) }
}

beforeEach(() => {
  vi.resetAllMocks()
  mockDb.adminActionLog.create.mockResolvedValue({})
  mockDb.adminOfficeAssignment.findMany.mockResolvedValue([])
})

// ─── Archive ──────────────────────────────────────────────────────────────────

describe("POST /api/admin/offices/[id]/archive", () => {
  it("returns 401 when unauthenticated", async () => {
    mockAuth.mockResolvedValue(null)
    const res = await archivePost(new Request("http://localhost"), makeParams("o1"))
    expect(res.status).toBe(401)
  })

  it("returns 403 for MID_ADMIN (SUPER_ADMIN only)", async () => {
    mockAuth.mockResolvedValue({ user: { id: "a1", role: "MID_ADMIN" } })
    const res = await archivePost(new Request("http://localhost"), makeParams("o1"))
    expect(res.status).toBe(403)
  })

  it("returns 404 when office not found", async () => {
    mockAuth.mockResolvedValue({ user: { id: "a1", role: "SUPER_ADMIN" } })
    mockDb.office.findUnique.mockResolvedValue(null)
    const res = await archivePost(new Request("http://localhost"), makeParams("o1"))
    expect(res.status).toBe(404)
  })

  it("returns 409 when office is already archived", async () => {
    mockAuth.mockResolvedValue({ user: { id: "a1", role: "SUPER_ADMIN" } })
    mockDb.office.findUnique.mockResolvedValue({ id: "o1", name: "دفتر", deletedAt: new Date() })
    const res = await archivePost(new Request("http://localhost"), makeParams("o1"))
    expect(res.status).toBe(409)
  })

  it("archives office and returns success", async () => {
    mockAuth.mockResolvedValue({ user: { id: "a1", role: "SUPER_ADMIN" } })
    mockDb.office.findUnique.mockResolvedValue({ id: "o1", name: "دفتر", deletedAt: null })
    mockDb.office.update.mockResolvedValue({})
    const res = await archivePost(new Request("http://localhost"), makeParams("o1"))
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.success).toBe(true)
    expect(mockDb.office.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "o1" }, data: expect.objectContaining({ deletedAt: expect.any(Date) }) })
    )
  })
})

// ─── Restore ──────────────────────────────────────────────────────────────────

describe("POST /api/admin/offices/[id]/restore", () => {
  it("returns 401 when unauthenticated", async () => {
    mockAuth.mockResolvedValue(null)
    const res = await restorePost(new Request("http://localhost"), makeParams("o1"))
    expect(res.status).toBe(401)
  })

  it("returns 403 for MID_ADMIN", async () => {
    mockAuth.mockResolvedValue({ user: { id: "a1", role: "MID_ADMIN" } })
    const res = await restorePost(new Request("http://localhost"), makeParams("o1"))
    expect(res.status).toBe(403)
  })

  it("returns 404 when office not found", async () => {
    mockAuth.mockResolvedValue({ user: { id: "a1", role: "SUPER_ADMIN" } })
    mockDb.office.findUnique.mockResolvedValue(null)
    const res = await restorePost(new Request("http://localhost"), makeParams("o1"))
    expect(res.status).toBe(404)
  })

  it("returns 409 when office is not archived", async () => {
    mockAuth.mockResolvedValue({ user: { id: "a1", role: "SUPER_ADMIN" } })
    mockDb.office.findUnique.mockResolvedValue({ id: "o1", name: "دفتر", deletedAt: null })
    const res = await restorePost(new Request("http://localhost"), makeParams("o1"))
    expect(res.status).toBe(409)
  })

  it("restores office and returns success", async () => {
    mockAuth.mockResolvedValue({ user: { id: "a1", role: "SUPER_ADMIN" } })
    mockDb.office.findUnique.mockResolvedValue({ id: "o1", name: "دفتر", deletedAt: new Date() })
    mockDb.office.update.mockResolvedValue({})
    const res = await restorePost(new Request("http://localhost"), makeParams("o1"))
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.success).toBe(true)
    expect(mockDb.office.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "o1" }, data: { deletedAt: null } })
    )
  })
})
