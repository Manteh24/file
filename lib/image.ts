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

type WatermarkOption =
  | false
  | { type: "text"; name: string }
  | { type: "image"; logoBuffer: Buffer }

interface ProcessPropertyPhotoOptions {
  /** Whether to resize and enhance the image. Defaults to true. */
  enhance?: boolean
  /** Watermark to apply. false = none, text = office name SVG, image = logo overlay. */
  watermark?: WatermarkOption
}

/**
 * Processes a raw uploaded property photo:
 *   1. Auto-rotate from EXIF orientation
 *   2. Optionally resize to fit within MAX_WIDTH × MAX_HEIGHT (no upscaling)
 *   3. Optionally composite a watermark (text or logo image) in the bottom-right corner
 *   4. Output as compressed JPEG
 *
 * @param buffer   Raw image buffer from the upload
 * @param options  Processing options (enhance, watermark)
 * @returns        Processed JPEG buffer
 */
export async function processPropertyPhoto(
  buffer: Buffer,
  options?: ProcessPropertyPhotoOptions
): Promise<Buffer> {
  const enhance = options?.enhance !== false
  const watermark = options?.watermark

  let base = sharp(buffer).rotate() // honour EXIF orientation

  if (enhance) {
    base = base.resize({
      width: MAX_WIDTH,
      height: MAX_HEIGHT,
      fit: "inside",
      withoutEnlargement: true,
    })
  }

  if (!watermark) {
    return base.jpeg({ quality: JPEG_QUALITY, progressive: true }).toBuffer()
  }

  if (watermark.type === "text") {
    // SVG watermark: semi-transparent bar in the bottom-right corner
    const safeName = escapeXml(watermark.name)
    const svgBuffer = Buffer.from(
      `<svg xmlns="http://www.w3.org/2000/svg" width="280" height="40">
        <rect width="280" height="40" rx="4" fill="black" fill-opacity="0.45"/>
        <text x="140" y="27" font-family="sans-serif" font-size="15"
              fill="white" fill-opacity="0.92" text-anchor="middle">${safeName}</text>
      </svg>`
    )
    return base
      .composite([{ input: svgBuffer, gravity: "southeast" }])
      .jpeg({ quality: JPEG_QUALITY, progressive: true })
      .toBuffer()
  }

  // Image watermark: resize logo to ~80px height, composite bottom-right
  const resizedLogo = await sharp(watermark.logoBuffer)
    .resize({ height: 80, withoutEnlargement: true })
    .png()
    .toBuffer()

  return base
    .composite([{ input: resizedLogo, gravity: "southeast", blend: "over" }])
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
