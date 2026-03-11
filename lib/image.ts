import sharp from "sharp"

const MAX_WIDTH = 1200
const MAX_HEIGHT = 900
const JPEG_QUALITY = 82
const AVATAR_SIZE = 300

/**
 * Escapes XML special characters for safe embedding in SVG text elements.
 */
function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

/**
 * Processes a raw uploaded property photo:
 *   1. Auto-rotate from EXIF orientation
 *   2. Resize to fit within MAX_WIDTH × MAX_HEIGHT (no upscaling)
 *   3. Optionally composite an office-name watermark in the bottom-right corner
 *   4. Output as compressed JPEG
 *
 * @param buffer     Raw image buffer from the upload
 * @param officeName Optional office name displayed as a watermark
 * @returns          Processed JPEG buffer
 */
export async function processPropertyPhoto(
  buffer: Buffer,
  officeName?: string
): Promise<Buffer> {
  const base = sharp(buffer)
    .rotate() // honour EXIF orientation, then strip EXIF
    .resize({
      width: MAX_WIDTH,
      height: MAX_HEIGHT,
      fit: "inside",
      withoutEnlargement: true,
    })

  if (!officeName) {
    return base.jpeg({ quality: JPEG_QUALITY, progressive: true }).toBuffer()
  }

  // SVG watermark: semi-transparent bar in the bottom-right corner
  const safeName = escapeXml(officeName)
  const watermark = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="280" height="40">
      <rect width="280" height="40" rx="4" fill="black" fill-opacity="0.45"/>
      <text x="140" y="27" font-family="sans-serif" font-size="15"
            fill="white" fill-opacity="0.92" text-anchor="middle">${safeName}</text>
    </svg>`
  )

  return base
    .composite([{ input: watermark, gravity: "southeast" }])
    .jpeg({ quality: JPEG_QUALITY, progressive: true })
    .toBuffer()
}

/**
 * Processes a user or office avatar/logo:
 *   1. Auto-rotate from EXIF orientation
 *   2. Crop to a centered square, resize to AVATAR_SIZE × AVATAR_SIZE
 *   3. Output as compressed JPEG (no watermark)
 */
export async function processAvatar(buffer: Buffer): Promise<Buffer> {
  return sharp(buffer)
    .rotate()
    .resize({
      width: AVATAR_SIZE,
      height: AVATAR_SIZE,
      fit: "cover",
      position: "center",
    })
    .jpeg({ quality: 85, progressive: true })
    .toBuffer()
}
