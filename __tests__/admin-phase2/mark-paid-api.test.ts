import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }))
vi.mock("@/lib/db", () => ({
  db: {
    referralMonthlyEarning: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    adminActionLog: { create: vi.fn() },
    adminOfficeAssignment: { findMany: vi.fn() },
  },
}))

import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { POST } from "@/app/api/admin/referral-codes/[codeId]/earnings/[earningId]/mark-paid/route"

const mockAuth = auth as ReturnType<typeof vi.fn>
const mockDb = db as unknown as {
  referralMonthlyEarning: {
    findUnique: ReturnType<typeof vi.fn>
    update: ReturnType<typeof vi.fn>
  }
  adminActionLog: { create: ReturnType<typeof vi.fn> }
  adminOfficeAssignment: { findMany: ReturnType<typeof vi.fn> }
}

function makeParams(codeId: string, earningId: string) {
  return Promise.resolve({ codeId, earningId })
}

beforeEach(() => {
  vi.clearAllMocks()
  mockDb.adminActionLog.create.mockResolvedValue({})
  mockDb.adminOfficeAssignment.findMany.mockResolvedValue([])
})

describe("POST /api/admin/referral-codes/[codeId]/earnings/[earningId]/mark-paid", () => {
  it("returns 401 when unauthenticated", async () => {
    mockAuth.mockResolvedValue(null)
    const res = await POST(new Request("http://localhost/"), { params: makeParams("c1", "e1") })
    expect(res.status).toBe(401)
  })

  it("returns 404 when earning not found or code mismatch", async () => {
    mockAuth.mockResolvedValue({ user: { id: "a1", role: "SUPER_ADMIN" } })
    mockDb.referralMonthlyEarning.findUnique.mockResolvedValue(null)
    const res = await POST(new Request("http://localhost/"), { params: makeParams("c1", "e1") })
    expect(res.status).toBe(404)
  })

  it("returns 409 when already paid", async () => {
    mockAuth.mockResolvedValue({ user: { id: "a1", role: "SUPER_ADMIN" } })
    mockDb.referralMonthlyEarning.findUnique.mockResolvedValue({
      id: "e1",
      referralCodeId: "c1",
      isPaid: true,
      yearMonth: "2026-03",
    })
    const res = await POST(new Request("http://localhost/"), { params: makeParams("c1", "e1") })
    expect(res.status).toBe(409)
  })

  it("marks as paid and returns success", async () => {
    mockAuth.mockResolvedValue({ user: { id: "a1", role: "SUPER_ADMIN" } })
    mockDb.referralMonthlyEarning.findUnique.mockResolvedValue({
      id: "e1",
      referralCodeId: "c1",
      isPaid: false,
      yearMonth: "2026-03",
    })
    mockDb.referralMonthlyEarning.update.mockResolvedValue({})

    const res = await POST(new Request("http://localhost/"), { params: makeParams("c1", "e1") })
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.success).toBe(true)
    expect(mockDb.referralMonthlyEarning.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "e1" },
        data: expect.objectContaining({ isPaid: true }),
      })
    )
  })
})
