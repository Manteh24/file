import { describe, it, expect, vi, beforeEach } from "vitest"

// ─── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }))

vi.mock("@/lib/db", () => ({
  db: {
    customer: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    customerNote: {
      findMany: vi.fn(),
      create: vi.fn(),
    },
  },
}))

import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { GET as listCustomers, POST as createCustomer } from "@/app/api/crm/route"
import {
  GET as getCustomer,
  PATCH as updateCustomer,
  DELETE as deleteCustomer,
} from "@/app/api/crm/[id]/route"
import {
  GET as listNotes,
  POST as createNote,
} from "@/app/api/crm/[id]/notes/route"

type MockFn = ReturnType<typeof vi.fn>

const mockAuth = auth as MockFn
const mockDb = db as unknown as {
  customer: {
    findMany: MockFn
    findFirst: MockFn
    create: MockFn
    update: MockFn
    delete: MockFn
  }
  customerNote: {
    findMany: MockFn
    create: MockFn
  }
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

function makeListRequest(queryString = ""): Request {
  return new Request(`http://localhost/api/crm${queryString}`)
}

function makeIdRequest(body?: unknown, method = "GET"): [Request, { params: Promise<{ id: string }> }] {
  const req = new Request("http://localhost/api/crm/cust-1", {
    method,
    headers: body ? { "Content-Type": "application/json" } : {},
    ...(body && { body: JSON.stringify(body) }),
  })
  const ctx = { params: Promise.resolve({ id: "cust-1" }) }
  return [req, ctx]
}

const managerSession = {
  user: { id: "user-1", officeId: "office-1", role: "MANAGER" },
}

const validCustomerBody = {
  name: "علی رضایی",
  phone: "09121234567",
  type: "BUYER",
}

// ─── GET /api/crm ───────────────────────────────────────────────────────────────

describe("GET /api/crm", () => {
  beforeEach(() => vi.clearAllMocks())

  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue(null)
    const res = await listCustomers(makeListRequest())
    expect(res.status).toBe(401)
    expect((await res.json()).success).toBe(false)
  })

  it("returns customer list for authenticated user", async () => {
    mockAuth.mockResolvedValue(managerSession)
    const mockList = [{ id: "cust-1", name: "علی", type: "BUYER" }]
    mockDb.customer.findMany.mockResolvedValue(mockList)

    const res = await listCustomers(makeListRequest())
    const data = await res.json()
    expect(res.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.data).toEqual(mockList)
  })

  it("always filters by officeId from session", async () => {
    mockAuth.mockResolvedValue(managerSession)
    mockDb.customer.findMany.mockResolvedValue([])

    await listCustomers(makeListRequest())

    const args = mockDb.customer.findMany.mock.calls[0][0]
    expect(args.where.officeId).toBe("office-1")
  })

  it("applies type filter from query params", async () => {
    mockAuth.mockResolvedValue(managerSession)
    mockDb.customer.findMany.mockResolvedValue([])

    await listCustomers(makeListRequest("?type=BUYER"))

    const args = mockDb.customer.findMany.mock.calls[0][0]
    expect(args.where.type).toBe("BUYER")
  })

  it("rejects invalid type filter", async () => {
    mockAuth.mockResolvedValue(managerSession)

    const res = await listCustomers(makeListRequest("?type=INVALID"))
    expect(res.status).toBe(400)
    expect((await res.json()).success).toBe(false)
  })

  it("returns empty array when no customers exist", async () => {
    mockAuth.mockResolvedValue(managerSession)
    mockDb.customer.findMany.mockResolvedValue([])

    const res = await listCustomers(makeListRequest())
    const data = await res.json()
    expect(res.status).toBe(200)
    expect(data.data).toEqual([])
  })

  it("omits type from where clause when no filter provided", async () => {
    mockAuth.mockResolvedValue(managerSession)
    mockDb.customer.findMany.mockResolvedValue([])

    await listCustomers(makeListRequest())

    const args = mockDb.customer.findMany.mock.calls[0][0]
    expect(args.where.type).toBeUndefined()
  })

  it("returns 500 when DB throws", async () => {
    mockAuth.mockResolvedValue(managerSession)
    mockDb.customer.findMany.mockRejectedValue(new Error("DB error"))

    const res = await listCustomers(makeListRequest())
    expect(res.status).toBe(500)
    expect((await res.json()).success).toBe(false)
  })
})

// ─── POST /api/crm ──────────────────────────────────────────────────────────────

describe("POST /api/crm", () => {
  beforeEach(() => vi.clearAllMocks())

  function makePostRequest(body: unknown): Request {
    return new Request("http://localhost/api/crm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
  }

  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue(null)
    const res = await createCustomer(makePostRequest(validCustomerBody))
    expect(res.status).toBe(401)
  })

  it("returns 400 when name is missing", async () => {
    mockAuth.mockResolvedValue(managerSession)
    const { name: _, ...body } = validCustomerBody
    const res = await createCustomer(makePostRequest(body))
    expect(res.status).toBe(400)
    expect((await res.json()).success).toBe(false)
  })

  it("returns 400 for invalid phone format", async () => {
    mockAuth.mockResolvedValue(managerSession)
    const res = await createCustomer(makePostRequest({ ...validCustomerBody, phone: "abc" }))
    expect(res.status).toBe(400)
  })

  it("creates customer with officeId from session (not from body)", async () => {
    mockAuth.mockResolvedValue(managerSession)
    mockDb.customer.create.mockResolvedValue({ id: "new-cust" })

    await createCustomer(makePostRequest({ ...validCustomerBody, officeId: "evil-office" }))

    const createArgs = mockDb.customer.create.mock.calls[0][0]
    expect(createArgs.data.officeId).toBe("office-1")
  })

  it("returns 201 with id on success", async () => {
    mockAuth.mockResolvedValue(managerSession)
    mockDb.customer.create.mockResolvedValue({ id: "new-cust" })

    const res = await createCustomer(makePostRequest(validCustomerBody))
    const data = await res.json()
    expect(res.status).toBe(201)
    expect(data.success).toBe(true)
    expect(data.data.id).toBe("new-cust")
  })

  it("returns 500 when DB throws", async () => {
    mockAuth.mockResolvedValue(managerSession)
    mockDb.customer.create.mockRejectedValue(new Error("DB error"))

    const res = await createCustomer(makePostRequest(validCustomerBody))
    expect(res.status).toBe(500)
  })

  it("returns 400 for malformed JSON", async () => {
    mockAuth.mockResolvedValue(managerSession)
    const req = new Request("http://localhost/api/crm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "not json",
    })
    const res = await createCustomer(req)
    expect(res.status).toBe(400)
  })

  it("normalizes empty string email to null in DB", async () => {
    mockAuth.mockResolvedValue(managerSession)
    mockDb.customer.create.mockResolvedValue({ id: "new-cust" })

    await createCustomer(makePostRequest({ ...validCustomerBody, email: "" }))

    const createArgs = mockDb.customer.create.mock.calls[0][0]
    expect(createArgs.data.email).toBeNull()
  })

  it("normalizes empty string notes to null in DB", async () => {
    mockAuth.mockResolvedValue(managerSession)
    mockDb.customer.create.mockResolvedValue({ id: "new-cust" })

    await createCustomer(makePostRequest({ ...validCustomerBody, notes: "" }))

    const createArgs = mockDb.customer.create.mock.calls[0][0]
    expect(createArgs.data.notes).toBeNull()
  })

  it("returns 400 for missing type", async () => {
    mockAuth.mockResolvedValue(managerSession)
    const { type: _, ...body } = validCustomerBody
    const res = await createCustomer(makePostRequest(body))
    expect(res.status).toBe(400)
  })
})

// ─── GET /api/crm/[id] ─────────────────────────────────────────────────────────

describe("GET /api/crm/[id]", () => {
  beforeEach(() => vi.clearAllMocks())

  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue(null)
    const [req, ctx] = makeIdRequest()
    const res = await getCustomer(req, ctx)
    expect(res.status).toBe(401)
  })

  it("returns 404 when customer not found or wrong office", async () => {
    mockAuth.mockResolvedValue(managerSession)
    mockDb.customer.findFirst.mockResolvedValue(null)

    const [req, ctx] = makeIdRequest()
    const res = await getCustomer(req, ctx)
    expect(res.status).toBe(404)
  })

  it("returns customer detail on success", async () => {
    mockAuth.mockResolvedValue(managerSession)
    const mockCustomer = { id: "cust-1", name: "علی", contactLogs: [] }
    mockDb.customer.findFirst.mockResolvedValue(mockCustomer)

    const [req, ctx] = makeIdRequest()
    const res = await getCustomer(req, ctx)
    const data = await res.json()
    expect(res.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.data).toEqual(mockCustomer)
  })

  it("always queries with officeId from session", async () => {
    mockAuth.mockResolvedValue(managerSession)
    mockDb.customer.findFirst.mockResolvedValue({ id: "cust-1" })

    const [req, ctx] = makeIdRequest()
    await getCustomer(req, ctx)

    const args = mockDb.customer.findFirst.mock.calls[0][0]
    expect(args.where.officeId).toBe("office-1")
  })
})

// ─── PATCH /api/crm/[id] ───────────────────────────────────────────────────────

describe("PATCH /api/crm/[id]", () => {
  beforeEach(() => vi.clearAllMocks())

  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue(null)
    const [req, ctx] = makeIdRequest({ name: "جدید" }, "PATCH")
    const res = await updateCustomer(req, ctx)
    expect(res.status).toBe(401)
  })

  it("returns 404 when customer not found or wrong office", async () => {
    mockAuth.mockResolvedValue(managerSession)
    mockDb.customer.findFirst.mockResolvedValue(null)

    const [req, ctx] = makeIdRequest({ name: "جدید" }, "PATCH")
    const res = await updateCustomer(req, ctx)
    expect(res.status).toBe(404)
  })

  it("updates customer and returns success", async () => {
    mockAuth.mockResolvedValue(managerSession)
    mockDb.customer.findFirst.mockResolvedValue({ id: "cust-1" })
    mockDb.customer.update.mockResolvedValue({ id: "cust-1" })

    const [req, ctx] = makeIdRequest({ name: "محمد احمدی" }, "PATCH")
    const res = await updateCustomer(req, ctx)
    const data = await res.json()
    expect(res.status).toBe(200)
    expect(data.success).toBe(true)
  })
})

// ─── DELETE /api/crm/[id] ──────────────────────────────────────────────────────

describe("DELETE /api/crm/[id]", () => {
  beforeEach(() => vi.clearAllMocks())

  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue(null)
    const [req, ctx] = makeIdRequest(undefined, "DELETE")
    const res = await deleteCustomer(req, ctx)
    expect(res.status).toBe(401)
  })

  it("returns 404 when customer not found or wrong office", async () => {
    mockAuth.mockResolvedValue(managerSession)
    mockDb.customer.findFirst.mockResolvedValue(null)

    const [req, ctx] = makeIdRequest(undefined, "DELETE")
    const res = await deleteCustomer(req, ctx)
    expect(res.status).toBe(404)
  })

  it("deletes customer and returns success", async () => {
    mockAuth.mockResolvedValue(managerSession)
    mockDb.customer.findFirst.mockResolvedValue({ id: "cust-1" })
    mockDb.customer.delete.mockResolvedValue({})

    const [req, ctx] = makeIdRequest(undefined, "DELETE")
    const res = await deleteCustomer(req, ctx)
    const data = await res.json()
    expect(res.status).toBe(200)
    expect(data.success).toBe(true)
  })
})

// ─── POST /api/crm/[id]/notes ──────────────────────────────────────────────────

describe("POST /api/crm/[id]/notes", () => {
  beforeEach(() => vi.clearAllMocks())

  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue(null)
    const [req, ctx] = makeIdRequest({ content: "تماس گرفته شد" }, "POST")
    const res = await createNote(req, ctx)
    expect(res.status).toBe(401)
  })

  it("returns 404 when customer not found or wrong office", async () => {
    mockAuth.mockResolvedValue(managerSession)
    mockDb.customer.findFirst.mockResolvedValue(null)

    const [req, ctx] = makeIdRequest({ content: "تماس گرفته شد" }, "POST")
    const res = await createNote(req, ctx)
    expect(res.status).toBe(404)
  })

  it("returns 400 when content is empty", async () => {
    mockAuth.mockResolvedValue(managerSession)
    mockDb.customer.findFirst.mockResolvedValue({ id: "cust-1" })

    const [req, ctx] = makeIdRequest({ content: "" }, "POST")
    const res = await createNote(req, ctx)
    expect(res.status).toBe(400)
  })

  it("creates note and returns 201 with id", async () => {
    mockAuth.mockResolvedValue(managerSession)
    mockDb.customer.findFirst.mockResolvedValue({ id: "cust-1" })
    mockDb.customerNote.create.mockResolvedValue({ id: "note-1" })

    const [req, ctx] = makeIdRequest({ content: "تماس گرفته شد" }, "POST")
    const res = await createNote(req, ctx)
    const data = await res.json()
    expect(res.status).toBe(201)
    expect(data.success).toBe(true)
    expect(data.data.id).toBe("note-1")
  })
})

// ─── GET /api/crm/[id]/notes ───────────────────────────────────────────────────

describe("GET /api/crm/[id]/notes", () => {
  beforeEach(() => vi.clearAllMocks())

  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue(null)
    const [req, ctx] = makeIdRequest()
    const res = await listNotes(req, ctx)
    expect(res.status).toBe(401)
  })

  it("returns 404 when customer not found or wrong office", async () => {
    mockAuth.mockResolvedValue(managerSession)
    mockDb.customer.findFirst.mockResolvedValue(null)

    const [req, ctx] = makeIdRequest()
    const res = await listNotes(req, ctx)
    expect(res.status).toBe(404)
  })

  it("returns notes list for the customer", async () => {
    mockAuth.mockResolvedValue(managerSession)
    mockDb.customer.findFirst.mockResolvedValue({ id: "cust-1" })
    const mockNotes = [{ id: "note-1", content: "تماس گرفته شد" }]
    mockDb.customerNote.findMany.mockResolvedValue(mockNotes)

    const [req, ctx] = makeIdRequest()
    const res = await listNotes(req, ctx)
    const data = await res.json()
    expect(res.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.data).toEqual(mockNotes)
  })
})
