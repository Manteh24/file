import { describe, it, expect, vi, beforeEach } from "vitest"

// ─── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }))

vi.mock("@/lib/db", () => ({
  db: {
    contract: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
    },
    propertyFile: {
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    shareLink: {
      updateMany: vi.fn(),
    },
    activityLog: {
      create: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}))

import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { GET as listContracts, POST as createContract } from "@/app/api/contracts/route"
import { GET as getContract } from "@/app/api/contracts/[id]/route"

type MockFn = ReturnType<typeof vi.fn>

const mockAuth = auth as MockFn
const mockDb = db as unknown as {
  contract: { findMany: MockFn; findFirst: MockFn; create: MockFn }
  propertyFile: { findFirst: MockFn; update: MockFn }
  shareLink: { updateMany: MockFn }
  activityLog: { create: MockFn }
  $transaction: MockFn
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

function makeListRequest(): Request {
  return new Request("http://localhost/api/contracts")
}

function makePostRequest(body?: unknown): Request {
  return new Request("http://localhost/api/contracts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    ...(body !== undefined && { body: typeof body === "string" ? body : JSON.stringify(body) }),
  })
}

function makeIdRequest(): [Request, { params: Promise<{ id: string }> }] {
  const req = new Request("http://localhost/api/contracts/contract-1")
  const ctx = { params: Promise.resolve({ id: "contract-1" }) }
  return [req, ctx]
}

const managerSession = {
  user: { id: "user-1", officeId: "office-1", role: "MANAGER" },
}
const agentSession = {
  user: { id: "user-2", officeId: "office-1", role: "AGENT" },
}

const validPostBody = {
  fileId: "file-1",
  finalPrice: 5000000,
  commissionAmount: 150000,
  agentShare: 75000,
  notes: "معامله موفق",
}

const mockContract = {
  id: "contract-1",
  transactionType: "SALE",
  finalPrice: 5000000,
  commissionAmount: 150000,
  agentShare: 75000,
  officeShare: 75000,
  finalizedAt: new Date(),
  file: { id: "file-1", address: "تهران، ولیعصر", neighborhood: "ولیعصر", propertyType: "APARTMENT" },
  finalizedBy: { displayName: "مدیر دفتر" },
}

// Mock the $transaction to execute the callback with a tx proxy
function mockTransactionSuccess() {
  mockDb.$transaction.mockImplementation(
    async (fn: (tx: typeof mockDb) => Promise<unknown>) => fn(mockDb)
  )
}

// ─── GET /api/contracts ─────────────────────────────────────────────────────────

describe("GET /api/contracts", () => {
  beforeEach(() => vi.clearAllMocks())

  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue(null)
    const res = await listContracts()
    expect(res.status).toBe(401)
    const body = await res.json()
    expect(body.success).toBe(false)
  })

  it("returns 403 when authenticated as AGENT", async () => {
    mockAuth.mockResolvedValue(agentSession)
    const res = await listContracts()
    expect(res.status).toBe(403)
  })

  it("returns contract list for MANAGER", async () => {
    mockAuth.mockResolvedValue(managerSession)
    mockDb.contract.findMany.mockResolvedValue([mockContract])
    const res = await listContracts()
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.success).toBe(true)
    expect(body.data).toHaveLength(1)
  })

  it("filters by officeId from session (not client)", async () => {
    mockAuth.mockResolvedValue(managerSession)
    mockDb.contract.findMany.mockResolvedValue([])
    await listContracts()
    expect(mockDb.contract.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ officeId: "office-1" }),
      })
    )
  })

  it("returns 500 on DB failure", async () => {
    mockAuth.mockResolvedValue(managerSession)
    mockDb.contract.findMany.mockRejectedValue(new Error("DB error"))
    const res = await listContracts()
    expect(res.status).toBe(500)
  })
})

// ─── POST /api/contracts ────────────────────────────────────────────────────────

describe("POST /api/contracts", () => {
  beforeEach(() => vi.clearAllMocks())

  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue(null)
    const res = await createContract(makePostRequest(validPostBody))
    expect(res.status).toBe(401)
  })

  it("returns 403 when authenticated as AGENT", async () => {
    mockAuth.mockResolvedValue(agentSession)
    const res = await createContract(makePostRequest(validPostBody))
    expect(res.status).toBe(403)
  })

  it("returns 400 for malformed JSON body", async () => {
    mockAuth.mockResolvedValue(managerSession)
    const res = await createContract(makePostRequest("not json"))
    expect(res.status).toBe(400)
  })

  it("returns 400 for missing fileId", async () => {
    mockAuth.mockResolvedValue(managerSession)
    const { fileId: _, ...body } = validPostBody
    const res = await createContract(makePostRequest(body))
    expect(res.status).toBe(400)
  })

  it("returns 400 when agentShare exceeds commissionAmount", async () => {
    mockAuth.mockResolvedValue(managerSession)
    const res = await createContract(
      makePostRequest({ ...validPostBody, agentShare: 999999 })
    )
    expect(res.status).toBe(400)
  })

  it("returns 404 when file is not found or not ACTIVE", async () => {
    mockAuth.mockResolvedValue(managerSession)
    mockDb.propertyFile.findFirst.mockResolvedValue(null)
    const res = await createContract(makePostRequest(validPostBody))
    expect(res.status).toBe(404)
  })

  it("returns 409 when file already has a contract", async () => {
    mockAuth.mockResolvedValue(managerSession)
    mockDb.propertyFile.findFirst.mockResolvedValue({
      id: "file-1",
      transactionType: "SALE",
      contract: { id: "existing-contract" },
    })
    const res = await createContract(makePostRequest(validPostBody))
    expect(res.status).toBe(409)
    const body = await res.json()
    expect(body.success).toBe(false)
  })

  it("creates contract successfully and returns 201 with id", async () => {
    mockAuth.mockResolvedValue(managerSession)
    mockDb.propertyFile.findFirst.mockResolvedValue({
      id: "file-1",
      transactionType: "SALE",
      contract: null,
    })
    mockTransactionSuccess()
    mockDb.contract.create.mockResolvedValue({ id: "contract-1" })
    mockDb.propertyFile.update.mockResolvedValue({})
    mockDb.shareLink.updateMany.mockResolvedValue({})
    mockDb.activityLog.create.mockResolvedValue({})

    const res = await createContract(makePostRequest(validPostBody))
    const body = await res.json()
    expect(res.status).toBe(201)
    expect(body.success).toBe(true)
    expect(body.data.id).toBe("contract-1")
  })

  it("transitions SALE file to SOLD status", async () => {
    mockAuth.mockResolvedValue(managerSession)
    mockDb.propertyFile.findFirst.mockResolvedValue({
      id: "file-1",
      transactionType: "SALE",
      contract: null,
    })
    mockTransactionSuccess()
    mockDb.contract.create.mockResolvedValue({ id: "contract-1" })
    mockDb.propertyFile.update.mockResolvedValue({})
    mockDb.shareLink.updateMany.mockResolvedValue({})
    mockDb.activityLog.create.mockResolvedValue({})

    await createContract(makePostRequest(validPostBody))

    expect(mockDb.propertyFile.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: "SOLD" }) })
    )
  })

  it("transitions LONG_TERM_RENT file to RENTED status", async () => {
    mockAuth.mockResolvedValue(managerSession)
    mockDb.propertyFile.findFirst.mockResolvedValue({
      id: "file-1",
      transactionType: "LONG_TERM_RENT",
      contract: null,
    })
    mockTransactionSuccess()
    mockDb.contract.create.mockResolvedValue({ id: "contract-1" })
    mockDb.propertyFile.update.mockResolvedValue({})
    mockDb.shareLink.updateMany.mockResolvedValue({})
    mockDb.activityLog.create.mockResolvedValue({})

    await createContract(makePostRequest(validPostBody))

    expect(mockDb.propertyFile.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: "RENTED" }) })
    )
  })

  it("transitions PRE_SALE file to SOLD status", async () => {
    mockAuth.mockResolvedValue(managerSession)
    mockDb.propertyFile.findFirst.mockResolvedValue({
      id: "file-1",
      transactionType: "PRE_SALE",
      contract: null,
    })
    mockTransactionSuccess()
    mockDb.contract.create.mockResolvedValue({ id: "contract-1" })
    mockDb.propertyFile.update.mockResolvedValue({})
    mockDb.shareLink.updateMany.mockResolvedValue({})
    mockDb.activityLog.create.mockResolvedValue({})

    await createContract(makePostRequest(validPostBody))

    expect(mockDb.propertyFile.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: "SOLD" }) })
    )
  })

  it("deactivates all active share links for the file", async () => {
    mockAuth.mockResolvedValue(managerSession)
    mockDb.propertyFile.findFirst.mockResolvedValue({
      id: "file-1",
      transactionType: "SALE",
      contract: null,
    })
    mockTransactionSuccess()
    mockDb.contract.create.mockResolvedValue({ id: "contract-1" })
    mockDb.propertyFile.update.mockResolvedValue({})
    mockDb.shareLink.updateMany.mockResolvedValue({})
    mockDb.activityLog.create.mockResolvedValue({})

    await createContract(makePostRequest(validPostBody))

    expect(mockDb.shareLink.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ fileId: "file-1", isActive: true }),
        data: { isActive: false },
      })
    )
  })

  it("computes officeShare server-side (commissionAmount - agentShare)", async () => {
    mockAuth.mockResolvedValue(managerSession)
    mockDb.propertyFile.findFirst.mockResolvedValue({
      id: "file-1",
      transactionType: "SALE",
      contract: null,
    })
    mockTransactionSuccess()
    mockDb.contract.create.mockResolvedValue({ id: "contract-1" })
    mockDb.propertyFile.update.mockResolvedValue({})
    mockDb.shareLink.updateMany.mockResolvedValue({})
    mockDb.activityLog.create.mockResolvedValue({})

    // commissionAmount=150000, agentShare=75000 → officeShare should be 75000
    await createContract(makePostRequest(validPostBody))

    expect(mockDb.contract.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ officeShare: BigInt(75000) }),
      })
    )
  })

  it("logs CONTRACT_FINALIZED activity", async () => {
    mockAuth.mockResolvedValue(managerSession)
    mockDb.propertyFile.findFirst.mockResolvedValue({
      id: "file-1",
      transactionType: "SALE",
      contract: null,
    })
    mockTransactionSuccess()
    mockDb.contract.create.mockResolvedValue({ id: "contract-1" })
    mockDb.propertyFile.update.mockResolvedValue({})
    mockDb.shareLink.updateMany.mockResolvedValue({})
    mockDb.activityLog.create.mockResolvedValue({})

    await createContract(makePostRequest(validPostBody))

    expect(mockDb.activityLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ action: "CONTRACT_FINALIZED", fileId: "file-1" }),
      })
    )
  })

  it("uses officeId from session (not from request body)", async () => {
    mockAuth.mockResolvedValue(managerSession)
    mockDb.propertyFile.findFirst.mockResolvedValue({
      id: "file-1",
      transactionType: "SALE",
      contract: null,
    })
    mockTransactionSuccess()
    mockDb.contract.create.mockResolvedValue({ id: "contract-1" })
    mockDb.propertyFile.update.mockResolvedValue({})
    mockDb.shareLink.updateMany.mockResolvedValue({})
    mockDb.activityLog.create.mockResolvedValue({})

    // Even if a spoofed officeId is in the body, it should be ignored
    await createContract(makePostRequest({ ...validPostBody, officeId: "evil-office" }))

    // The file lookup uses session officeId
    expect(mockDb.propertyFile.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ officeId: "office-1" }),
      })
    )
    // The contract is created with session officeId
    expect(mockDb.contract.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ officeId: "office-1" }),
      })
    )
  })

  it("returns 500 when DB transaction fails", async () => {
    mockAuth.mockResolvedValue(managerSession)
    mockDb.propertyFile.findFirst.mockResolvedValue({
      id: "file-1",
      transactionType: "SALE",
      contract: null,
    })
    mockDb.$transaction.mockRejectedValue(new Error("DB error"))

    const res = await createContract(makePostRequest(validPostBody))
    expect(res.status).toBe(500)
  })
})

// ─── GET /api/contracts/[id] ────────────────────────────────────────────────────

describe("GET /api/contracts/[id]", () => {
  beforeEach(() => vi.clearAllMocks())

  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue(null)
    const [req, ctx] = makeIdRequest()
    const res = await getContract(req, ctx)
    expect(res.status).toBe(401)
  })

  it("returns 403 when authenticated as AGENT", async () => {
    mockAuth.mockResolvedValue(agentSession)
    const [req, ctx] = makeIdRequest()
    const res = await getContract(req, ctx)
    expect(res.status).toBe(403)
  })

  it("returns 404 when contract not found or belongs to another office", async () => {
    mockAuth.mockResolvedValue(managerSession)
    mockDb.contract.findFirst.mockResolvedValue(null)
    const [req, ctx] = makeIdRequest()
    const res = await getContract(req, ctx)
    expect(res.status).toBe(404)
    const body = await res.json()
    expect(body.success).toBe(false)
  })

  it("returns contract detail for MANAGER", async () => {
    mockAuth.mockResolvedValue(managerSession)
    mockDb.contract.findFirst.mockResolvedValue(mockContract)
    const [req, ctx] = makeIdRequest()
    const res = await getContract(req, ctx)
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.success).toBe(true)
    expect(body.data.id).toBe("contract-1")
  })

  it("filters by officeId from session when fetching contract", async () => {
    mockAuth.mockResolvedValue(managerSession)
    mockDb.contract.findFirst.mockResolvedValue(mockContract)
    const [req, ctx] = makeIdRequest()
    await getContract(req, ctx)
    expect(mockDb.contract.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ officeId: "office-1", id: "contract-1" }),
      })
    )
  })

  it("returns 500 on DB failure", async () => {
    mockAuth.mockResolvedValue(managerSession)
    mockDb.contract.findFirst.mockRejectedValue(new Error("DB error"))
    const [req, ctx] = makeIdRequest()
    const res = await getContract(req, ctx)
    expect(res.status).toBe(500)
  })
})
