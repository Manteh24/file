import { describe, it, expect, vi, beforeEach } from "vitest"

// ─── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }))

vi.mock("@/lib/db", () => ({
  db: {
    shareLink: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    propertyFile: {
      findFirst: vi.fn(),
    },
    activityLog: {
      create: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}))

import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import {
  GET as listShareLinks,
  POST as createShareLink,
} from "@/app/api/files/[id]/share-links/route"
import { PATCH as deactivateShareLink } from "@/app/api/share-links/[id]/route"

type MockFn = ReturnType<typeof vi.fn>

const mockAuth = auth as MockFn
const mockDb = db as unknown as {
  shareLink: { findMany: MockFn; findFirst: MockFn; findUnique: MockFn; create: MockFn; update: MockFn }
  propertyFile: { findFirst: MockFn }
  activityLog: { create: MockFn }
  $transaction: MockFn
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

function makeFileCtx() {
  return { params: Promise.resolve({ id: "file-1" }) }
}

function makeLinkCtx() {
  return { params: Promise.resolve({ id: "link-1" }) }
}

function makeGetRequest(): Request {
  return new Request("http://localhost/api/files/file-1/share-links")
}

function makePostRequest(body?: unknown): Request {
  return new Request("http://localhost/api/files/file-1/share-links", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    ...(body !== undefined && { body: typeof body === "string" ? body : JSON.stringify(body) }),
  })
}

function makePatchRequest(): Request {
  return new Request("http://localhost/api/share-links/link-1", { method: "PATCH" })
}

const managerSession = { user: { id: "user-1", officeId: "office-1", role: "MANAGER" } }
const agentSession = { user: { id: "user-2", officeId: "office-1", role: "AGENT" } }

const mockActiveFile = { id: "file-1", status: "ACTIVE" }
const mockArchivedFile = { id: "file-1", status: "ARCHIVED" }

const mockLink = {
  id: "link-1",
  token: "abc123def456abc1",
  customPrice: null,
  viewCount: 0,
  isActive: true,
  createdAt: new Date(),
  createdBy: { displayName: "مدیر دفتر" },
}

function mockTransactionSuccess() {
  mockDb.$transaction.mockImplementation(
    async (fn: (tx: typeof mockDb) => Promise<unknown>) => fn(mockDb)
  )
}

beforeEach(() => {
  vi.clearAllMocks()
})

// ─── GET /api/files/[id]/share-links ───────────────────────────────────────────

describe("GET /api/files/[id]/share-links", () => {
  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue(null)
    const res = await listShareLinks(makeGetRequest(), makeFileCtx())
    expect(res.status).toBe(401)
  })

  it("returns 404 when file not in office", async () => {
    mockAuth.mockResolvedValue(managerSession)
    mockDb.propertyFile.findFirst.mockResolvedValue(null)
    const res = await listShareLinks(makeGetRequest(), makeFileCtx())
    expect(res.status).toBe(404)
  })

  it("returns 200 with share links for manager", async () => {
    mockAuth.mockResolvedValue(managerSession)
    mockDb.propertyFile.findFirst.mockResolvedValue({ id: "file-1" })
    mockDb.shareLink.findMany.mockResolvedValue([mockLink])
    const res = await listShareLinks(makeGetRequest(), makeFileCtx())
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(body.data).toHaveLength(1)
  })

  it("returns 200 with share links for assigned agent", async () => {
    mockAuth.mockResolvedValue(agentSession)
    // Agent query includes userId filter via assignedAgents
    mockDb.propertyFile.findFirst.mockResolvedValue({ id: "file-1" })
    mockDb.shareLink.findMany.mockResolvedValue([mockLink])
    const res = await listShareLinks(makeGetRequest(), makeFileCtx())
    expect(res.status).toBe(200)
    // Agent query must filter by assignedAgents
    expect(mockDb.propertyFile.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          assignedAgents: { some: { userId: "user-2" } },
        }),
      })
    )
  })

  it("returns 404 for agent not assigned to file", async () => {
    mockAuth.mockResolvedValue(agentSession)
    mockDb.propertyFile.findFirst.mockResolvedValue(null)
    const res = await listShareLinks(makeGetRequest(), makeFileCtx())
    expect(res.status).toBe(404)
  })
})

// ─── POST /api/files/[id]/share-links ──────────────────────────────────────────

describe("POST /api/files/[id]/share-links", () => {
  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue(null)
    const res = await createShareLink(makePostRequest({}), makeFileCtx())
    expect(res.status).toBe(401)
  })

  it("returns 400 for malformed JSON", async () => {
    mockAuth.mockResolvedValue(managerSession)
    const res = await createShareLink(makePostRequest("not-json"), makeFileCtx())
    expect(res.status).toBe(400)
  })

  it("returns 400 for invalid customPrice (negative)", async () => {
    mockAuth.mockResolvedValue(managerSession)
    const res = await createShareLink(makePostRequest({ customPrice: -1000 }), makeFileCtx())
    expect(res.status).toBe(400)
  })

  it("returns 404 when file not in office", async () => {
    mockAuth.mockResolvedValue(managerSession)
    mockDb.propertyFile.findFirst.mockResolvedValue(null)
    const res = await createShareLink(makePostRequest({}), makeFileCtx())
    expect(res.status).toBe(404)
  })

  it("returns 400 when file is not ACTIVE", async () => {
    mockAuth.mockResolvedValue(managerSession)
    mockDb.propertyFile.findFirst.mockResolvedValue(mockArchivedFile)
    const res = await createShareLink(makePostRequest({}), makeFileCtx())
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toContain("فعال")
  })

  it("returns 201 and creates link without customPrice", async () => {
    mockAuth.mockResolvedValue(managerSession)
    mockDb.propertyFile.findFirst.mockResolvedValue(mockActiveFile)
    mockTransactionSuccess()
    mockDb.shareLink.create.mockResolvedValue(mockLink)
    mockDb.activityLog.create.mockResolvedValue({})
    const res = await createShareLink(makePostRequest({}), makeFileCtx())
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.success).toBe(true)
    // customPrice should be null in the created record
    expect(mockDb.shareLink.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ customPrice: null }),
      })
    )
  })

  it("returns 201 and creates link with customPrice (agent)", async () => {
    mockAuth.mockResolvedValue(agentSession)
    mockDb.propertyFile.findFirst.mockResolvedValue(mockActiveFile)
    mockTransactionSuccess()
    const linkWithPrice = { ...mockLink, customPrice: 3000000 }
    mockDb.shareLink.create.mockResolvedValue(linkWithPrice)
    mockDb.activityLog.create.mockResolvedValue({})
    const res = await createShareLink(
      makePostRequest({ customPrice: 3000000 }),
      makeFileCtx()
    )
    expect(res.status).toBe(201)
    expect(mockDb.shareLink.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ customPrice: 3000000 }),
      })
    )
  })

  it("logs SHARE_LINK activity on creation", async () => {
    mockAuth.mockResolvedValue(managerSession)
    mockDb.propertyFile.findFirst.mockResolvedValue(mockActiveFile)
    mockTransactionSuccess()
    mockDb.shareLink.create.mockResolvedValue(mockLink)
    mockDb.activityLog.create.mockResolvedValue({})
    await createShareLink(makePostRequest({}), makeFileCtx())
    expect(mockDb.activityLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ action: "SHARE_LINK" }),
      })
    )
  })

  it("returns 500 on DB transaction failure", async () => {
    mockAuth.mockResolvedValue(managerSession)
    mockDb.propertyFile.findFirst.mockResolvedValue(mockActiveFile)
    mockDb.$transaction.mockRejectedValue(new Error("DB error"))
    const res = await createShareLink(makePostRequest({}), makeFileCtx())
    expect(res.status).toBe(500)
  })
})

// ─── PATCH /api/share-links/[id] ───────────────────────────────────────────────

describe("PATCH /api/share-links/[id]", () => {
  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue(null)
    const res = await deactivateShareLink(makePatchRequest(), makeLinkCtx())
    expect(res.status).toBe(401)
  })

  it("returns 403 for agent (manager-only)", async () => {
    mockAuth.mockResolvedValue(agentSession)
    const res = await deactivateShareLink(makePatchRequest(), makeLinkCtx())
    expect(res.status).toBe(403)
  })

  it("returns 404 when link not found or wrong office", async () => {
    mockAuth.mockResolvedValue(managerSession)
    mockDb.shareLink.findFirst.mockResolvedValue(null)
    const res = await deactivateShareLink(makePatchRequest(), makeLinkCtx())
    expect(res.status).toBe(404)
  })

  it("returns 200 and deactivates an active link", async () => {
    mockAuth.mockResolvedValue(managerSession)
    mockDb.shareLink.findFirst.mockResolvedValue({ id: "link-1", isActive: true })
    mockDb.shareLink.update.mockResolvedValue({ id: "link-1", isActive: false })
    const res = await deactivateShareLink(makePatchRequest(), makeLinkCtx())
    expect(res.status).toBe(200)
    expect(mockDb.shareLink.update).toHaveBeenCalledWith({
      where: { id: "link-1" },
      data: { isActive: false },
    })
  })

  it("returns 200 for already-inactive link without calling update", async () => {
    mockAuth.mockResolvedValue(managerSession)
    mockDb.shareLink.findFirst.mockResolvedValue({ id: "link-1", isActive: false })
    const res = await deactivateShareLink(makePatchRequest(), makeLinkCtx())
    expect(res.status).toBe(200)
    // No update call needed — already inactive
    expect(mockDb.shareLink.update).not.toHaveBeenCalled()
  })
})
