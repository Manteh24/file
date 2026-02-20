import { describe, it, expect, vi, beforeEach } from "vitest"

// ─── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}))

vi.mock("@/lib/db", () => ({
  db: {
    propertyFile: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    activityLog: {
      create: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}))

import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { GET, POST } from "@/app/api/files/route"

type MockFn = ReturnType<typeof vi.fn>

const mockAuth = auth as MockFn
const mockDb = db as unknown as {
  propertyFile: {
    findMany: MockFn
    findFirst: MockFn
    create: MockFn
  }
  activityLog: { create: MockFn }
  $transaction: MockFn
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

function makeRequest(body?: unknown): Request {
  return new Request("http://localhost/api/files", {
    method: body ? "POST" : "GET",
    headers: { "Content-Type": "application/json" },
    ...(body && { body: JSON.stringify(body) }),
  })
}

const managerSession = {
  user: { id: "user-1", officeId: "office-1", role: "MANAGER" },
}

const agentSession = {
  user: { id: "user-2", officeId: "office-1", role: "AGENT" },
}

// ─── GET /api/files ─────────────────────────────────────────────────────────────

describe("GET /api/files", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue(null)
    const response = await GET(makeRequest())
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.success).toBe(false)
  })

  it("returns files for authenticated manager", async () => {
    mockAuth.mockResolvedValue(managerSession)
    const mockFiles = [{ id: "file-1", transactionType: "SALE" }]
    mockDb.propertyFile.findMany.mockResolvedValue(mockFiles)

    const response = await GET(makeRequest())
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.data).toEqual(mockFiles)
  })

  it("agent query includes assignment filter", async () => {
    mockAuth.mockResolvedValue(agentSession)
    mockDb.propertyFile.findMany.mockResolvedValue([])

    await GET(makeRequest())

    const callArgs = mockDb.propertyFile.findMany.mock.calls[0][0]
    expect(callArgs.where.assignedAgents).toBeDefined()
    expect(callArgs.where.assignedAgents.some.userId).toBe("user-2")
  })

  it("manager query does NOT include assignment filter", async () => {
    mockAuth.mockResolvedValue(managerSession)
    mockDb.propertyFile.findMany.mockResolvedValue([])

    await GET(makeRequest())

    const callArgs = mockDb.propertyFile.findMany.mock.calls[0][0]
    expect(callArgs.where.assignedAgents).toBeUndefined()
  })

  it("always filters by officeId from session", async () => {
    mockAuth.mockResolvedValue(managerSession)
    mockDb.propertyFile.findMany.mockResolvedValue([])

    await GET(makeRequest())

    const callArgs = mockDb.propertyFile.findMany.mock.calls[0][0]
    expect(callArgs.where.officeId).toBe("office-1")
  })

  it("applies status filter from query params", async () => {
    mockAuth.mockResolvedValue(managerSession)
    mockDb.propertyFile.findMany.mockResolvedValue([])

    const req = new Request("http://localhost/api/files?status=ACTIVE")
    await GET(req)

    const callArgs = mockDb.propertyFile.findMany.mock.calls[0][0]
    expect(callArgs.where.status).toBe("ACTIVE")
  })

  it("rejects invalid status filter", async () => {
    mockAuth.mockResolvedValue(managerSession)

    const req = new Request("http://localhost/api/files?status=INVALID")
    const response = await GET(req)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.success).toBe(false)
  })
})

// ─── POST /api/files ────────────────────────────────────────────────────────────

describe("POST /api/files", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  const validBody = {
    transactionType: "SALE",
    address: "تهران، خیابان ولیعصر",
    contacts: [{ type: "OWNER", phone: "09121234567" }],
  }

  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue(null)
    const response = await POST(makeRequest(validBody))
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.success).toBe(false)
  })

  it("returns 400 for invalid body (missing address)", async () => {
    mockAuth.mockResolvedValue(managerSession)
    const { address: _, ...invalidBody } = validBody

    const response = await POST(makeRequest(invalidBody))
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.success).toBe(false)
  })

  it("returns 400 when contacts array is empty", async () => {
    mockAuth.mockResolvedValue(managerSession)

    const response = await POST(makeRequest({ ...validBody, contacts: [] }))
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.success).toBe(false)
  })

  it("creates file successfully and returns id", async () => {
    mockAuth.mockResolvedValue(managerSession)
    mockDb.$transaction.mockImplementation(async (fn: (tx: typeof mockDb) => Promise<unknown>) =>
      fn(mockDb)
    )
    mockDb.propertyFile.create.mockResolvedValue({ id: "new-file-id" })
    mockDb.activityLog.create.mockResolvedValue({})

    const response = await POST(makeRequest(validBody))
    const data = await response.json()

    expect(response.status).toBe(201)
    expect(data.success).toBe(true)
    expect(data.data.id).toBe("new-file-id")
  })

  it("creates file with officeId from session (not from body)", async () => {
    mockAuth.mockResolvedValue(managerSession)
    mockDb.$transaction.mockImplementation(async (fn: (tx: typeof mockDb) => Promise<unknown>) =>
      fn(mockDb)
    )
    mockDb.propertyFile.create.mockResolvedValue({ id: "new-file-id" })
    mockDb.activityLog.create.mockResolvedValue({})

    // Body contains a spoofed officeId — should be ignored
    const bodyWithSpoofedOffice = { ...validBody, officeId: "evil-office" }
    await POST(makeRequest(bodyWithSpoofedOffice))

    const createArgs = mockDb.propertyFile.create.mock.calls[0][0]
    expect(createArgs.data.officeId).toBe("office-1")
  })

  it("creates activity log entry on file creation", async () => {
    mockAuth.mockResolvedValue(managerSession)
    mockDb.$transaction.mockImplementation(async (fn: (tx: typeof mockDb) => Promise<unknown>) =>
      fn(mockDb)
    )
    mockDb.propertyFile.create.mockResolvedValue({ id: "new-file-id" })
    mockDb.activityLog.create.mockResolvedValue({})

    await POST(makeRequest(validBody))

    expect(mockDb.activityLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ action: "CREATE", fileId: "new-file-id" }),
      })
    )
  })

  it("returns 500 when DB transaction fails", async () => {
    mockAuth.mockResolvedValue(managerSession)
    mockDb.$transaction.mockRejectedValue(new Error("DB error"))

    const response = await POST(makeRequest(validBody))
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.success).toBe(false)
  })

  it("returns 400 for malformed JSON body", async () => {
    mockAuth.mockResolvedValue(managerSession)
    const req = new Request("http://localhost/api/files", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "not json",
    })

    const response = await POST(req)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.success).toBe(false)
  })
})
