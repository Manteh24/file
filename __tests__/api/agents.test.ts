import { describe, it, expect, vi, beforeEach } from "vitest"

// ─── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }))

vi.mock("@/lib/db", () => ({
  db: {
    user: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
  },
}))

// bcrypt must be mocked before the route handlers import it
vi.mock("bcryptjs", () => ({
  default: {
    hash: vi.fn().mockResolvedValue("hashed-password"),
    compare: vi.fn().mockResolvedValue(true),
  },
}))

import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { GET as listAgents, POST as createAgent } from "@/app/api/agents/route"
import {
  GET as getAgent,
  PATCH as updateAgent,
  DELETE as deactivateAgent,
} from "@/app/api/agents/[id]/route"
import { POST as resetPassword } from "@/app/api/agents/[id]/reset-password/route"

type MockFn = ReturnType<typeof vi.fn>

const mockAuth = auth as MockFn
const mockDb = db as unknown as {
  user: {
    findMany: MockFn
    findFirst: MockFn
    create: MockFn
    update: MockFn
  }
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

function makeListRequest(): Request {
  return new Request("http://localhost/api/agents")
}

function makeIdRequest(
  body?: unknown,
  method = "GET"
): [Request, { params: Promise<{ id: string }> }] {
  const req = new Request("http://localhost/api/agents/agent-1", {
    method,
    headers: body ? { "Content-Type": "application/json" } : {},
    ...(body && { body: JSON.stringify(body) }),
  })
  const ctx = { params: Promise.resolve({ id: "agent-1" }) }
  return [req, ctx]
}

function makeResetRequest(
  body?: unknown
): [Request, { params: Promise<{ id: string }> }] {
  const req = new Request("http://localhost/api/agents/agent-1/reset-password", {
    method: "POST",
    headers: body ? { "Content-Type": "application/json" } : {},
    ...(body && { body: JSON.stringify(body) }),
  })
  const ctx = { params: Promise.resolve({ id: "agent-1" }) }
  return [req, ctx]
}

const managerSession = {
  user: { id: "user-1", officeId: "office-1", role: "MANAGER" },
}
const agentSession = {
  user: { id: "user-2", officeId: "office-1", role: "AGENT" },
}

const validCreateBody = {
  username: "agent_new",
  displayName: "مشاور جدید",
  password: "SecurePass1",
}

const mockAgent = {
  id: "agent-1",
  username: "agent_ali",
  displayName: "علی رضایی",
  email: null,
  isActive: true,
  officeId: "office-1",
  createdAt: new Date(),
  updatedAt: new Date(),
  _count: { fileAssignments: 3 },
  fileAssignments: [],
}

// ─── GET /api/agents ────────────────────────────────────────────────────────────

describe("GET /api/agents", () => {
  beforeEach(() => vi.clearAllMocks())

  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue(null)
    const res = await listAgents()
    expect(res.status).toBe(401)
  })

  it("returns 403 when authenticated as AGENT", async () => {
    mockAuth.mockResolvedValue(agentSession)
    const res = await listAgents()
    expect(res.status).toBe(403)
  })

  it("returns agent list for MANAGER", async () => {
    mockAuth.mockResolvedValue(managerSession)
    mockDb.user.findMany.mockResolvedValue([mockAgent])
    const res = await listAgents()
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.success).toBe(true)
    expect(body.data).toHaveLength(1)
  })

  it("filters by officeId from session (not client)", async () => {
    mockAuth.mockResolvedValue(managerSession)
    mockDb.user.findMany.mockResolvedValue([])
    await listAgents()
    expect(mockDb.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ officeId: "office-1" }),
      })
    )
  })

  it("returns 500 on DB failure", async () => {
    mockAuth.mockResolvedValue(managerSession)
    mockDb.user.findMany.mockRejectedValue(new Error("DB error"))
    const res = await listAgents()
    expect(res.status).toBe(500)
  })
})

// ─── POST /api/agents ───────────────────────────────────────────────────────────

describe("POST /api/agents", () => {
  beforeEach(() => vi.clearAllMocks())

  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue(null)
    const res = await createAgent(
      new Request("http://localhost/api/agents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validCreateBody),
      })
    )
    expect(res.status).toBe(401)
  })

  it("returns 403 when authenticated as AGENT", async () => {
    mockAuth.mockResolvedValue(agentSession)
    const res = await createAgent(
      new Request("http://localhost/api/agents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validCreateBody),
      })
    )
    expect(res.status).toBe(403)
  })

  it("returns 400 for invalid body (missing username)", async () => {
    mockAuth.mockResolvedValue(managerSession)
    const res = await createAgent(
      new Request("http://localhost/api/agents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayName: "Test", password: "password123" }),
      })
    )
    expect(res.status).toBe(400)
  })

  it("returns 409 when username already taken", async () => {
    mockAuth.mockResolvedValue(managerSession)
    mockDb.user.findFirst.mockResolvedValue({ id: "existing", username: "agent_new", email: null })
    const res = await createAgent(
      new Request("http://localhost/api/agents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validCreateBody),
      })
    )
    expect(res.status).toBe(409)
    const body = await res.json()
    expect(body.error).toMatch(/نام کاربری/)
  })

  it("creates agent successfully", async () => {
    mockAuth.mockResolvedValue(managerSession)
    mockDb.user.findFirst.mockResolvedValue(null)
    mockDb.user.create.mockResolvedValue({ id: "new-agent-id" })
    const res = await createAgent(
      new Request("http://localhost/api/agents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validCreateBody),
      })
    )
    const body = await res.json()
    expect(res.status).toBe(201)
    expect(body.success).toBe(true)
    expect(body.data.id).toBe("new-agent-id")
  })

  it("sets role=AGENT and officeId from session", async () => {
    mockAuth.mockResolvedValue(managerSession)
    mockDb.user.findFirst.mockResolvedValue(null)
    mockDb.user.create.mockResolvedValue({ id: "new-agent-id" })
    await createAgent(
      new Request("http://localhost/api/agents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validCreateBody),
      })
    )
    expect(mockDb.user.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ role: "AGENT", officeId: "office-1" }),
      })
    )
  })
})

// ─── GET /api/agents/[id] ───────────────────────────────────────────────────────

describe("GET /api/agents/[id]", () => {
  beforeEach(() => vi.clearAllMocks())

  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue(null)
    const [req, ctx] = makeIdRequest()
    const res = await getAgent(req, ctx)
    expect(res.status).toBe(401)
  })

  it("returns 403 when authenticated as AGENT", async () => {
    mockAuth.mockResolvedValue(agentSession)
    const [req, ctx] = makeIdRequest()
    const res = await getAgent(req, ctx)
    expect(res.status).toBe(403)
  })

  it("returns 404 when agent not found", async () => {
    mockAuth.mockResolvedValue(managerSession)
    mockDb.user.findFirst.mockResolvedValue(null)
    const [req, ctx] = makeIdRequest()
    const res = await getAgent(req, ctx)
    expect(res.status).toBe(404)
  })

  it("returns agent detail for MANAGER", async () => {
    mockAuth.mockResolvedValue(managerSession)
    mockDb.user.findFirst.mockResolvedValue(mockAgent)
    const [req, ctx] = makeIdRequest()
    const res = await getAgent(req, ctx)
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.success).toBe(true)
    expect(body.data.username).toBe("agent_ali")
  })
})

// ─── PATCH /api/agents/[id] ────────────────────────────────────────────────────

describe("PATCH /api/agents/[id]", () => {
  beforeEach(() => vi.clearAllMocks())

  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue(null)
    const [req, ctx] = makeIdRequest({ displayName: "نام جدید" }, "PATCH")
    const res = await updateAgent(req, ctx)
    expect(res.status).toBe(401)
  })

  it("returns 403 when authenticated as AGENT", async () => {
    mockAuth.mockResolvedValue(agentSession)
    const [req, ctx] = makeIdRequest({ displayName: "نام جدید" }, "PATCH")
    const res = await updateAgent(req, ctx)
    expect(res.status).toBe(403)
  })

  it("returns 404 when agent not found or wrong office", async () => {
    mockAuth.mockResolvedValue(managerSession)
    mockDb.user.findFirst.mockResolvedValue(null)
    const [req, ctx] = makeIdRequest({ displayName: "نام جدید" }, "PATCH")
    const res = await updateAgent(req, ctx)
    expect(res.status).toBe(404)
  })

  it("updates agent displayName successfully", async () => {
    mockAuth.mockResolvedValue(managerSession)
    mockDb.user.findFirst.mockResolvedValue({ id: "agent-1" })
    mockDb.user.update.mockResolvedValue({ id: "agent-1" })
    const [req, ctx] = makeIdRequest({ displayName: "نام جدید" }, "PATCH")
    const res = await updateAgent(req, ctx)
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.success).toBe(true)
  })

  it("soft-deactivates via isActive: false", async () => {
    mockAuth.mockResolvedValue(managerSession)
    mockDb.user.findFirst.mockResolvedValue({ id: "agent-1" })
    mockDb.user.update.mockResolvedValue({ id: "agent-1" })
    const [req, ctx] = makeIdRequest({ isActive: false }, "PATCH")
    await updateAgent(req, ctx)
    expect(mockDb.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ isActive: false }),
      })
    )
  })
})

// ─── DELETE /api/agents/[id] ───────────────────────────────────────────────────

describe("DELETE /api/agents/[id]", () => {
  beforeEach(() => vi.clearAllMocks())

  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue(null)
    const [req, ctx] = makeIdRequest(undefined, "DELETE")
    const res = await deactivateAgent(req, ctx)
    expect(res.status).toBe(401)
  })

  it("returns 403 when authenticated as AGENT", async () => {
    mockAuth.mockResolvedValue(agentSession)
    const [req, ctx] = makeIdRequest(undefined, "DELETE")
    const res = await deactivateAgent(req, ctx)
    expect(res.status).toBe(403)
  })

  it("returns 404 when agent not found", async () => {
    mockAuth.mockResolvedValue(managerSession)
    mockDb.user.findFirst.mockResolvedValue(null)
    const [req, ctx] = makeIdRequest(undefined, "DELETE")
    const res = await deactivateAgent(req, ctx)
    expect(res.status).toBe(404)
  })

  it("sets isActive=false (soft delete, no hard delete)", async () => {
    mockAuth.mockResolvedValue(managerSession)
    mockDb.user.findFirst.mockResolvedValue({ id: "agent-1" })
    mockDb.user.update.mockResolvedValue({ id: "agent-1" })
    const [req, ctx] = makeIdRequest(undefined, "DELETE")
    const res = await deactivateAgent(req, ctx)
    expect(res.status).toBe(200)
    expect(mockDb.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { isActive: false },
      })
    )
  })
})

// ─── POST /api/agents/[id]/reset-password ───────────────────────────────────────

describe("POST /api/agents/[id]/reset-password", () => {
  beforeEach(() => vi.clearAllMocks())

  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue(null)
    const [req, ctx] = makeResetRequest({ newPassword: "NewPass123" })
    const res = await resetPassword(req, ctx)
    expect(res.status).toBe(401)
  })

  it("returns 403 when authenticated as AGENT", async () => {
    mockAuth.mockResolvedValue(agentSession)
    const [req, ctx] = makeResetRequest({ newPassword: "NewPass123" })
    const res = await resetPassword(req, ctx)
    expect(res.status).toBe(403)
  })

  it("returns 404 when agent not found or wrong office", async () => {
    mockAuth.mockResolvedValue(managerSession)
    mockDb.user.findFirst.mockResolvedValue(null)
    const [req, ctx] = makeResetRequest({ newPassword: "NewPass123" })
    const res = await resetPassword(req, ctx)
    expect(res.status).toBe(404)
  })

  it("returns 400 when password is too short", async () => {
    mockAuth.mockResolvedValue(managerSession)
    mockDb.user.findFirst.mockResolvedValue({ id: "agent-1" })
    const [req, ctx] = makeResetRequest({ newPassword: "short" })
    const res = await resetPassword(req, ctx)
    expect(res.status).toBe(400)
  })

  it("resets password successfully", async () => {
    mockAuth.mockResolvedValue(managerSession)
    mockDb.user.findFirst.mockResolvedValue({ id: "agent-1" })
    mockDb.user.update.mockResolvedValue({ id: "agent-1" })
    const [req, ctx] = makeResetRequest({ newPassword: "NewSecurePass1" })
    const res = await resetPassword(req, ctx)
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.success).toBe(true)
    // Verify password was hashed, not stored plain
    expect(mockDb.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ passwordHash: "hashed-password" }),
      })
    )
  })
})
