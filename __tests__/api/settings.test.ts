import { describe, it, expect, vi, beforeEach } from "vitest"

// ─── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }))

vi.mock("@/lib/db", () => ({
  db: {
    office: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    subscription: {
      findUnique: vi.fn(),
    },
  },
}))

import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { GET, PATCH } from "@/app/api/settings/route"

type MockFn = ReturnType<typeof vi.fn>

const mockAuth = auth as MockFn
const mockDb = db as unknown as {
  office: { findUnique: MockFn; update: MockFn }
  subscription: { findUnique: MockFn }
}

const managerSession = {
  user: { id: "user-1", officeId: "office-1", role: "MANAGER" },
}
const agentSession = {
  user: { id: "user-2", officeId: "office-1", role: "AGENT" },
}

const fakeOffice = {
  id: "office-1",
  name: "دفتر نمونه",
  phone: "02112345678",
  email: "office@test.com",
  address: "تهران",
  city: "تهران",
}

const fakeSubscription = {
  plan: "TRIAL",
  status: "ACTIVE",
  trialEndsAt: new Date("2026-03-22"),
  currentPeriodEnd: null,
}

// ─── GET /api/settings ─────────────────────────────────────────────────────────

describe("GET /api/settings", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAuth.mockResolvedValue(managerSession)
    mockDb.office.findUnique.mockResolvedValue(fakeOffice)
    mockDb.subscription.findUnique.mockResolvedValue(fakeSubscription)
  })

  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue(null)
    const res = await GET()
    expect(res.status).toBe(401)
    const body = await res.json()
    expect(body.success).toBe(false)
  })

  it("returns 403 when authenticated as AGENT", async () => {
    mockAuth.mockResolvedValue(agentSession)
    const res = await GET()
    expect(res.status).toBe(403)
    const body = await res.json()
    expect(body.success).toBe(false)
  })

  it("returns office and subscription data on success", async () => {
    const res = await GET()
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(body.data.office.id).toBe("office-1")
    expect(body.data.subscription.plan).toBe("TRIAL")
  })

  it("returns subscription null when no subscription record exists", async () => {
    mockDb.subscription.findUnique.mockResolvedValue(null)
    const res = await GET()
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(body.data.subscription).toBeNull()
  })

  it("returns 500 on DB error", async () => {
    mockDb.office.findUnique.mockRejectedValue(new Error("DB down"))
    const res = await GET()
    expect(res.status).toBe(500)
    const body = await res.json()
    expect(body.success).toBe(false)
  })
})

// ─── PATCH /api/settings ───────────────────────────────────────────────────────

describe("PATCH /api/settings", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAuth.mockResolvedValue(managerSession)
    mockDb.office.update.mockResolvedValue({ id: "office-1" })
  })

  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue(null)
    const req = new Request("http://localhost/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "دفتر" }),
    })
    const res = await PATCH(req)
    expect(res.status).toBe(401)
  })

  it("returns 403 when authenticated as AGENT", async () => {
    mockAuth.mockResolvedValue(agentSession)
    const req = new Request("http://localhost/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "دفتر" }),
    })
    const res = await PATCH(req)
    expect(res.status).toBe(403)
  })

  it("returns 400 for invalid JSON body", async () => {
    const req = new Request("http://localhost/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: "not json{",
    })
    const res = await PATCH(req)
    expect(res.status).toBe(400)
  })

  it("returns 400 when name is empty", async () => {
    const req = new Request("http://localhost/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "" }),
    })
    const res = await PATCH(req)
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBe("نام دفتر الزامی است")
  })

  it("returns 400 for invalid phone format", async () => {
    const req = new Request("http://localhost/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "دفتر", phone: "invalid" }),
    })
    const res = await PATCH(req)
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBe("شماره تماس معتبر نیست")
  })

  it("normalizes empty strings to null in the DB call", async () => {
    const req = new Request("http://localhost/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "دفتر", phone: "", email: "", address: "", city: "" }),
    })
    await PATCH(req)
    expect(mockDb.office.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          phone: null,
          email: null,
          address: null,
          city: null,
        }),
      })
    )
  })

  it("returns 200 and office id on success", async () => {
    const req = new Request("http://localhost/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "دفتر نمونه", city: "تهران" }),
    })
    const res = await PATCH(req)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(body.data.id).toBe("office-1")
  })
})
