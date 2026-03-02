import { describe, it, expect, vi, beforeEach } from "vitest"

// ─── Mock Dexie ───────────────────────────────────────────────────────────────
// vi.hoisted lets us create the mock fns before vi.mock is evaluated,
// so the same references are used inside the factory and in tests.

const { mockGet, mockPut, mockDelete } = vi.hoisted(() => ({
  mockGet: vi.fn(),
  mockPut: vi.fn(),
  mockDelete: vi.fn(),
}))

vi.mock("dexie", () => {
  class MockDexie {
    // Expose the mock table at construction time so sub-classes can use it
    drafts = { get: mockGet, put: mockPut, delete: mockDelete }
    version() {
      return { stores: () => {} }
    }
  }
  return { default: MockDexie }
})

import { loadDraftFromDb, saveDraftToDb, clearDraftFromDb } from "@/hooks/useDraft"
import type { CreateFileInput } from "@/lib/validations/file"

// ─── Minimal valid form data ──────────────────────────────────────────────────

function makeFormData(overrides: Partial<CreateFileInput> = {}): CreateFileInput {
  return {
    transactionType: "SALE",
    address: "خیابان ولیعصر",
    contacts: [{ type: "OWNER", name: "علی رضایی", phone: "09121234567", notes: "" }],
    hasElevator: false,
    hasParking: false,
    hasStorage: false,
    hasBalcony: false,
    hasSecurity: false,
    ...overrides,
  }
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("loadDraftFromDb", () => {
  beforeEach(() => vi.clearAllMocks())

  it("returns null when no draft exists", async () => {
    mockGet.mockResolvedValue(undefined)
    const result = await loadDraftFromDb()
    expect(result).toBeNull()
  })

  it("returns the stored draft when one exists", async () => {
    const stored = { key: "new-file-draft", formData: makeFormData(), savedAt: new Date() }
    mockGet.mockResolvedValue(stored)
    const result = await loadDraftFromDb()
    expect(result).toEqual(stored)
  })

  it("calls get() with the correct draft key", async () => {
    mockGet.mockResolvedValue(undefined)
    await loadDraftFromDb()
    expect(mockGet).toHaveBeenCalledWith("new-file-draft")
  })
})

describe("saveDraftToDb", () => {
  beforeEach(() => vi.clearAllMocks())

  it("calls put() with the draft key and form data", async () => {
    mockPut.mockResolvedValue(undefined)
    const formData = makeFormData({ area: 120 })
    await saveDraftToDb(formData)
    expect(mockPut).toHaveBeenCalledWith(
      expect.objectContaining({
        key: "new-file-draft",
        formData,
      })
    )
  })

  it("includes a savedAt Date in the put payload", async () => {
    mockPut.mockResolvedValue(undefined)
    await saveDraftToDb(makeFormData())
    const [payload] = mockPut.mock.calls[0] as [{ savedAt: unknown }]
    expect(payload.savedAt).toBeInstanceOf(Date)
  })

  it("overwrites an existing draft (same key → upsert)", async () => {
    mockPut.mockResolvedValue(undefined)
    await saveDraftToDb(makeFormData({ area: 80 }))
    await saveDraftToDb(makeFormData({ area: 120 }))
    expect(mockPut).toHaveBeenCalledTimes(2)
    // Both calls use the same key — Dexie put() semantics guarantee overwrite
    const [first] = mockPut.mock.calls[0] as [{ key: string }]
    const [second] = mockPut.mock.calls[1] as [{ key: string }]
    expect(first.key).toBe(second.key)
  })
})

describe("clearDraftFromDb", () => {
  beforeEach(() => vi.clearAllMocks())

  it("calls delete() with the correct draft key", async () => {
    mockDelete.mockResolvedValue(undefined)
    await clearDraftFromDb()
    expect(mockDelete).toHaveBeenCalledWith("new-file-draft")
  })

  it("resolves without throwing when no draft exists", async () => {
    mockDelete.mockResolvedValue(undefined)
    await expect(clearDraftFromDb()).resolves.toBeUndefined()
  })
})
