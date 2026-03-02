import { describe, it, expect, vi, beforeEach } from "vitest"

// ── Mock sharp ────────────────────────────────────────────────────────────────

const mockToBuffer = vi.fn().mockResolvedValue(Buffer.from("processed-jpeg"))
const mockComposite = vi.fn().mockReturnThis()
const mockJpeg = vi.fn().mockReturnThis()
const mockResize = vi.fn().mockReturnThis()
const mockRotate = vi.fn().mockReturnThis()

const mockSharpInstance = {
  rotate: mockRotate,
  resize: mockResize,
  composite: mockComposite,
  jpeg: mockJpeg,
  toBuffer: mockToBuffer,
}

vi.mock("sharp", () => ({
  default: vi.fn(() => mockSharpInstance),
}))

// Import after mocking
import { processPropertyPhoto } from "@/lib/image"

describe("processPropertyPhoto", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset chainable mocks
    mockRotate.mockReturnValue(mockSharpInstance)
    mockResize.mockReturnValue(mockSharpInstance)
    mockComposite.mockReturnValue(mockSharpInstance)
    mockJpeg.mockReturnValue(mockSharpInstance)
    mockToBuffer.mockResolvedValue(Buffer.from("processed-jpeg"))
  })

  it("returns a processed Buffer", async () => {
    const input = Buffer.from("fake-image-data")
    const result = await processPropertyPhoto(input)
    expect(result).toBeInstanceOf(Buffer)
  })

  it("calls rotate() for EXIF auto-orientation", async () => {
    await processPropertyPhoto(Buffer.from("img"))
    expect(mockRotate).toHaveBeenCalledTimes(1)
    expect(mockRotate).toHaveBeenCalledWith()
  })

  it("resizes to max 1200×900 with inside fit and no upscaling", async () => {
    await processPropertyPhoto(Buffer.from("img"))
    expect(mockResize).toHaveBeenCalledWith({
      width: 1200,
      height: 900,
      fit: "inside",
      withoutEnlargement: true,
    })
  })

  it("outputs JPEG with quality 82 and progressive encoding", async () => {
    await processPropertyPhoto(Buffer.from("img"))
    expect(mockJpeg).toHaveBeenCalledWith({ quality: 82, progressive: true })
  })

  it("does NOT add a watermark when officeName is not provided", async () => {
    await processPropertyPhoto(Buffer.from("img"))
    expect(mockComposite).not.toHaveBeenCalled()
  })

  it("does NOT add a watermark when officeName is an empty string", async () => {
    await processPropertyPhoto(Buffer.from("img"), "")
    expect(mockComposite).not.toHaveBeenCalled()
  })

  it("adds a composite watermark when officeName is provided", async () => {
    await processPropertyPhoto(Buffer.from("img"), "دفتر مشاور")
    expect(mockComposite).toHaveBeenCalledTimes(1)
    const [args] = mockComposite.mock.calls
    expect(args[0]).toHaveLength(1)
    expect(args[0][0]).toMatchObject({ gravity: "southeast" })
    expect(args[0][0].input).toBeInstanceOf(Buffer)
  })

  it("escapes XML special characters in the office name watermark", async () => {
    await processPropertyPhoto(Buffer.from("img"), '<script>"hack"&</script>')
    expect(mockComposite).toHaveBeenCalledTimes(1)
    const svgBuffer = mockComposite.mock.calls[0][0][0].input as Buffer
    const svgString = svgBuffer.toString()
    expect(svgString).toContain("&lt;script&gt;")
    expect(svgString).toContain("&quot;hack&quot;")
    expect(svgString).toContain("&amp;")
    expect(svgString).not.toContain("<script>")
  })

  it("still outputs JPEG when a watermark is applied", async () => {
    await processPropertyPhoto(Buffer.from("img"), "Test Office")
    expect(mockJpeg).toHaveBeenCalledWith({ quality: 82, progressive: true })
  })
})
