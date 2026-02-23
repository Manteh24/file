import { describe, it, expect, vi, beforeEach } from "vitest"

// ─── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }))
vi.mock("@/lib/maps", () => ({
  reverseGeocode: vi.fn(),
  analyzeLocation: vi.fn(),
}))
vi.mock("@/lib/db", () => ({
  db: { propertyFile: { findFirst: vi.fn(), update: vi.fn() } },
}))

import { auth } from "@/lib/auth"
import { reverseGeocode, analyzeLocation } from "@/lib/maps"
import { db } from "@/lib/db"
import { GET as reverseGeocodeRoute } from "@/app/api/maps/reverse-geocode/route"
import { POST as analyzeLocationRoute } from "@/app/api/files/[id]/analyze-location/route"

type MockFn = ReturnType<typeof vi.fn>

const mockAuth = auth as MockFn
const mockReverseGeocode = reverseGeocode as MockFn
const mockAnalyzeLocation = analyzeLocation as MockFn
const mockDb = db as unknown as {
  propertyFile: { findFirst: MockFn; update: MockFn }
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

function makeGetRequest(params: Record<string, string>): Request {
  const url = new URL("http://localhost/api/maps/reverse-geocode")
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v))
  return new Request(url.toString(), { method: "GET" })
}

function makePostRequest(id: string): [Request, { params: Promise<{ id: string }> }] {
  const req = new Request(`http://localhost/api/files/${id}/analyze-location`, {
    method: "POST",
  })
  const ctx = { params: Promise.resolve({ id }) }
  return [req, ctx]
}

const session = { user: { id: "user-1", officeId: "office-1", role: "MANAGER" } }

const sampleAnalysis = {
  nearbyPOIs: [
    { title: "مترو ونک", category: "transit", distance: 400 },
    { title: "پارک ملت", category: "park", distance: 900 },
  ],
  transitWalkingMinutes: 5,
  airportDrivingMinutes: 25,
  analyzedAt: "2024-06-01T10:00:00.000Z",
}

// ─── GET /api/maps/reverse-geocode ─────────────────────────────────────────────

describe("GET /api/maps/reverse-geocode", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAuth.mockResolvedValue(session)
    mockReverseGeocode.mockResolvedValue("تهران، خیابان ولیعصر")
  })

  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue(null)
    const req = makeGetRequest({ lat: "35.6892", lng: "51.389" })
    const res = await reverseGeocodeRoute(req)
    expect(res.status).toBe(401)
    const body = await res.json()
    expect(body.success).toBe(false)
  })

  it("returns 400 when lat param is missing", async () => {
    const req = makeGetRequest({ lng: "51.389" })
    const res = await reverseGeocodeRoute(req)
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.success).toBe(false)
  })

  it("returns 400 when lng param is missing", async () => {
    const req = makeGetRequest({ lat: "35.6892" })
    const res = await reverseGeocodeRoute(req)
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.success).toBe(false)
  })

  it("returns 400 when lat is not a valid number", async () => {
    const req = makeGetRequest({ lat: "not-a-number", lng: "51.389" })
    const res = await reverseGeocodeRoute(req)
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.success).toBe(false)
  })

  it("returns 400 when lat is out of range", async () => {
    const req = makeGetRequest({ lat: "95", lng: "51.389" })
    const res = await reverseGeocodeRoute(req)
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.success).toBe(false)
  })

  it("returns 400 when lng is out of range", async () => {
    const req = makeGetRequest({ lat: "35.6892", lng: "200" })
    const res = await reverseGeocodeRoute(req)
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.success).toBe(false)
  })

  it("returns 200 with address on happy path", async () => {
    const req = makeGetRequest({ lat: "35.6892", lng: "51.389" })
    const res = await reverseGeocodeRoute(req)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(body.data.address).toBe("تهران، خیابان ولیعصر")
    expect(mockReverseGeocode).toHaveBeenCalledWith(35.6892, 51.389)
  })

  it("returns 200 with null address when Neshan returns nothing", async () => {
    mockReverseGeocode.mockResolvedValue(null)
    const req = makeGetRequest({ lat: "35.6892", lng: "51.389" })
    const res = await reverseGeocodeRoute(req)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(body.data.address).toBeNull()
  })
})

// ─── POST /api/files/[id]/analyze-location ─────────────────────────────────────

describe("POST /api/files/[id]/analyze-location", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAuth.mockResolvedValue(session)
    mockDb.propertyFile.findFirst.mockResolvedValue({
      latitude: 35.6892,
      longitude: 51.389,
    })
    mockDb.propertyFile.update.mockResolvedValue({})
    mockAnalyzeLocation.mockResolvedValue(sampleAnalysis)
  })

  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue(null)
    const [req, ctx] = makePostRequest("file-1")
    const res = await analyzeLocationRoute(req, ctx)
    expect(res.status).toBe(401)
    const body = await res.json()
    expect(body.success).toBe(false)
  })

  it("returns 404 when file is not found for this office", async () => {
    mockDb.propertyFile.findFirst.mockResolvedValue(null)
    const [req, ctx] = makePostRequest("nonexistent-id")
    const res = await analyzeLocationRoute(req, ctx)
    expect(res.status).toBe(404)
    const body = await res.json()
    expect(body.success).toBe(false)
  })

  it("returns 400 when file has no latitude", async () => {
    mockDb.propertyFile.findFirst.mockResolvedValue({ latitude: null, longitude: 51.389 })
    const [req, ctx] = makePostRequest("file-1")
    const res = await analyzeLocationRoute(req, ctx)
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.success).toBe(false)
  })

  it("returns 400 when file has no longitude", async () => {
    mockDb.propertyFile.findFirst.mockResolvedValue({ latitude: 35.6892, longitude: null })
    const [req, ctx] = makePostRequest("file-1")
    const res = await analyzeLocationRoute(req, ctx)
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.success).toBe(false)
  })

  it("returns 200 with analysis on happy path", async () => {
    const [req, ctx] = makePostRequest("file-1")
    const res = await analyzeLocationRoute(req, ctx)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(body.data.nearbyPOIs).toHaveLength(2)
    expect(body.data.transitWalkingMinutes).toBe(5)
    expect(body.data.airportDrivingMinutes).toBe(25)
  })

  it("calls analyzeLocation with file's lat/lng", async () => {
    const [req, ctx] = makePostRequest("file-1")
    await analyzeLocationRoute(req, ctx)
    expect(mockAnalyzeLocation).toHaveBeenCalledWith(35.6892, 51.389)
  })

  it("stores analysis in DB via propertyFile.update", async () => {
    const [req, ctx] = makePostRequest("file-1")
    await analyzeLocationRoute(req, ctx)
    expect(mockDb.propertyFile.update).toHaveBeenCalledOnce()
    expect(mockDb.propertyFile.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "file-1" },
        data: expect.objectContaining({ locationAnalysis: expect.any(Object) }),
      })
    )
  })

  it("queries file with correct officeId for multi-tenancy", async () => {
    const [req, ctx] = makePostRequest("file-1")
    await analyzeLocationRoute(req, ctx)
    expect(mockDb.propertyFile.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id: "file-1", officeId: "office-1" }),
      })
    )
  })
})
