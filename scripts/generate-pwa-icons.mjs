/**
 * Generates placeholder PWA icons for public/icons/.
 * Run with: node scripts/generate-pwa-icons.mjs
 *
 * Produces a simple building icon (dark background, amber roof + body)
 * that suits the real-estate theme. Replace with production artwork before launch.
 */

import sharp from "sharp"
import { mkdir } from "fs/promises"
import { join, dirname } from "path"
import { fileURLToPath } from "url"

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUTPUT_DIR = join(__dirname, "..", "public", "icons")

/**
 * Builds an SVG string for the given pixel size.
 * The viewBox is always 100×100; Sharp scales it to `size` on export.
 */
function buildSvg(size) {
  return `<svg xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 100 100" width="${size}" height="${size}">

  <!-- Background: matches manifest theme_color -->
  <rect width="100" height="100" rx="20" ry="20" fill="#18181b"/>

  <!-- Building body -->
  <rect x="22" y="41" width="56" height="44" rx="2" fill="#d97706"/>

  <!-- Roof (triangle) -->
  <polygon points="50,16 84,42 16,42" fill="#f59e0b"/>

  <!-- Door -->
  <rect x="40" y="59" width="20" height="26" rx="3" fill="#18181b"/>

  <!-- Left window -->
  <rect x="26" y="50" width="13" height="10" rx="2" fill="#fef3c7"/>

  <!-- Right window -->
  <rect x="61" y="50" width="13" height="10" rx="2" fill="#fef3c7"/>

</svg>`
}

async function generateIcon(size) {
  const svg = Buffer.from(buildSvg(size))
  const outPath = join(OUTPUT_DIR, `icon-${size}.png`)
  await sharp(svg).png().toFile(outPath)
  console.log(`  generated ${outPath}`)
}

await mkdir(OUTPUT_DIR, { recursive: true })
console.log("Generating PWA icons…")
await generateIcon(192)
await generateIcon(512)
console.log("Done.")
