import { describe, it, expect, vi, beforeEach } from "vitest"

// ─── Mocks ──────────────────────────────────────────────────────────────────

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}))

vi.mock("@/lib/db", () => ({
  db: {
    propertyFile: { findFirst: vi.fn() },
    filePhoto: { count: vi.fn(), create: vi.fn() },
  },
}))

vi.mock("@/lib/image", () => ({
  processPropertyPhoto: vi.fn(),
}))

vi.mock("@/lib/storage", () => ({
  uploadFile: vi.fn(),
  generatePhotoKey: vi.fn(),
}))

import { NextRequest } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { processPropertyPhoto } from "@/lib/image"
import { uploadFile, generatePhotoKey } from "@/lib/storage"
import { POST } from "@/app/api/upload/route"

type MockFn = ReturnType<typeof vi.fn>

const mockAuth = auth as MockFn
const mockDb = db as unknown as {
  propertyFile: { findFirst: MockFn }
  filePhoto: { count: MockFn; create: MockFn }
}
const mockProcessPhoto = processPropertyPhoto as MockFn
const mockUploadFile = uploadFile as MockFn
const mockGenerateKey = generatePhotoKey as MockFn

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeSession(officeId: string | null = "office-1") {
  return { user: { officeId, id: "user-1", role: "MANAGER" } }
}

function makeFormData(file?: File, fileId?: string): FormData {
  const fd = new FormData()
  if (file) fd.append("file", file)
  if (fileId !== undefined) fd.append("fileId", fileId)
  return fd
}

function makeJpegFile(sizeBytes = 100, type = "image/jpeg"): File {
  const content = new Uint8Array(sizeBytes).fill(0xff)
  return new File([content], "photo.jpg", { type })
}

function makeRequest(formData: FormData): NextRequest {
  return new NextRequest("http://localhost/api/upload", {
    method: "POST",
    body: formData,
  })
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("POST /api/upload", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAuth.mockResolvedValue(makeSession())
    mockDb.propertyFile.findFirst.mockResolvedValue({
      id: "file-1",
      officeId: "office-1",
      office: {
        name: "دفتر تهران",
        logoUrl: null,
        photoEnhancementMode: "ALWAYS",
        watermarkMode: "ALWAYS",
      },
    })
    mockDb.filePhoto.count.mockResolvedValue(0)
    mockProcessPhoto.mockResolvedValue(Buffer.from("processed"))
    mockGenerateKey.mockReturnValue("photos/office-1/file-1/key.jpg")
    mockUploadFile.mockResolvedValue("https://storage.example.com/bucket/photos/key.jpg")
    mockDb.filePhoto.create.mockResolvedValue({
      id: "photo-1",
      url: "https://storage.example.com/bucket/photos/key.jpg",
      order: 0,
      createdAt: new Date(),
    })
  })

  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue(null)
    const res = await POST(makeRequest(makeFormData(makeJpegFile(), "file-1")))
    expect(res.status).toBe(401)
  })

  it("returns 403 when user has no officeId (admin user)", async () => {
    mockAuth.mockResolvedValue(makeSession(null))
    const res = await POST(makeRequest(makeFormData(makeJpegFile(), "file-1")))
    expect(res.status).toBe(403)
  })

  it("returns 400 when no file is included", async () => {
    const fd = makeFormData(undefined, "file-1")
    const res = await POST(makeRequest(fd))
    expect(res.status).toBe(400)
    const body = await res.json() as { success: boolean; error: string }
    expect(body.success).toBe(false)
  })

  it("returns 400 when fileId is missing", async () => {
    const fd = makeFormData(makeJpegFile(), undefined)
    const res = await POST(makeRequest(fd))
    expect(res.status).toBe(400)
    const body = await res.json() as { success: boolean; error: string }
    expect(body.success).toBe(false)
  })

  it("returns 400 for non-image MIME type", async () => {
    const textFile = new File(["hello"], "doc.pdf", { type: "application/pdf" })
    const res = await POST(makeRequest(makeFormData(textFile, "file-1")))
    expect(res.status).toBe(400)
    const body = await res.json() as { success: boolean; error: string }
    expect(body.success).toBe(false)
    expect(body.error).toMatch(/فرمت/)
  })

  it("returns 400 when file exceeds 10 MB", async () => {
    const bigFile = makeJpegFile(11 * 1024 * 1024)
    const res = await POST(makeRequest(makeFormData(bigFile, "file-1")))
    expect(res.status).toBe(400)
    const body = await res.json() as { success: boolean; error: string }
    expect(body.success).toBe(false)
    expect(body.error).toMatch(/مگابایت/)
  })

  it("returns 404 when fileId does not belong to the office", async () => {
    mockDb.propertyFile.findFirst.mockResolvedValue(null)
    const res = await POST(makeRequest(makeFormData(makeJpegFile(), "wrong-file")))
    expect(res.status).toBe(404)
  })

  it("returns 400 when the file already has 20 photos", async () => {
    mockDb.filePhoto.count.mockResolvedValue(20)
    const res = await POST(makeRequest(makeFormData(makeJpegFile(), "file-1")))
    expect(res.status).toBe(400)
    const body = await res.json() as { success: boolean; error: string }
    expect(body.success).toBe(false)
    expect(body.error).toMatch(/20/)
  })

  it("returns 200 with photo data on success", async () => {
    const res = await POST(makeRequest(makeFormData(makeJpegFile(), "file-1")))
    expect(res.status).toBe(200)
    const body = await res.json() as { success: boolean; data: { id: string; url: string } }
    expect(body.success).toBe(true)
    expect(body.data.id).toBe("photo-1")
    expect(body.data.url).toBe("https://storage.example.com/bucket/photos/key.jpg")
  })

  it("calls processPropertyPhoto with raw buffer and options (ALWAYS mode uses text watermark)", async () => {
    await POST(makeRequest(makeFormData(makeJpegFile(), "file-1")))
    expect(mockProcessPhoto).toHaveBeenCalledWith(
      expect.any(Buffer),
      expect.objectContaining({
        enhance: true,
        watermark: expect.objectContaining({ type: "text", name: "دفتر تهران" }),
      })
    )
  })

  it("calls uploadFile with the generated key and processed buffer", async () => {
    await POST(makeRequest(makeFormData(makeJpegFile(), "file-1")))
    expect(mockUploadFile).toHaveBeenCalledWith(
      "photos/office-1/file-1/key.jpg",
      expect.any(Buffer),
      "image/jpeg"
    )
  })

  it("stores the photo with order equal to the current photo count", async () => {
    mockDb.filePhoto.count.mockResolvedValue(3)
    await POST(makeRequest(makeFormData(makeJpegFile(), "file-1")))
    expect(mockDb.filePhoto.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ order: 3 }),
      })
    )
  })
})
