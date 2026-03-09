import type { DivarImportResult } from "@/types"

// ─── Category map ──────────────────────────────────────────────────────────────
// Maps Divar category slugs to our TransactionType + PropertyType.
// Extend this as more Divar categories are encountered in the wild.

const DIVAR_CATEGORY_MAP: Record<
  string,
  { transactionType: DivarImportResult["fields"]["transactionType"]; propertyType: DivarImportResult["fields"]["propertyType"] }
> = {
  "apartment-sell":   { transactionType: "SALE",           propertyType: "APARTMENT" },
  "apartment-rent":   { transactionType: "LONG_TERM_RENT", propertyType: "APARTMENT" },
  "villa-sell":       { transactionType: "SALE",           propertyType: "VILLA" },
  "house-sell":       { transactionType: "SALE",           propertyType: "HOUSE" },
  "office-sell":      { transactionType: "SALE",           propertyType: "OFFICE" },
  "office-rent":      { transactionType: "LONG_TERM_RENT", propertyType: "OFFICE" },
  "commercial-sell":  { transactionType: "SALE",           propertyType: "COMMERCIAL" },
  "land-sell":        { transactionType: "SALE",           propertyType: "LAND" },
}

// ─── Token extraction ──────────────────────────────────────────────────────────

/**
 * Extracts the Divar listing token from a divar.ir URL.
 * Handles both city-prefixed paths (/v/tehran/TOKEN) and direct paths (/v/TOKEN).
 * Returns null for non-Divar or malformed URLs.
 */
export function extractDivarToken(url: string): string | null {
  try {
    const parsed = new URL(url)
    if (!parsed.hostname.endsWith("divar.ir")) return null
    // Path is like /v/category/TOKEN or /v/TOKEN
    const segments = parsed.pathname.split("/").filter(Boolean)
    // Must start with "v"
    if (segments[0] !== "v") return null
    // Token is always the last path segment, min 4 chars
    const token = segments[segments.length - 1]
    if (!token || token.length < 4) return null
    return token
  } catch {
    return null
  }
}

// ─── Divar API call ────────────────────────────────────────────────────────────

/**
 * Fetches a Divar listing by token from the public Divar v8 API.
 * Throws on non-2xx responses.
 */
export async function fetchDivarListing(token: string): Promise<unknown> {
  const response = await fetch(`https://api.divar.ir/v8/posts/${token}`, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      "Accept": "application/json",
      "x-render-type": "CSR",
    },
    signal: AbortSignal.timeout(8000),
  })

  if (!response.ok) {
    throw new Error(`Divar API returned ${response.status}`)
  }

  return response.json()
}

// ─── Persian numeral helper ────────────────────────────────────────────────────

/**
 * Converts a string that may contain Persian/Arabic numerals and commas
 * to a JavaScript integer. Returns undefined if parsing fails.
 */
export function parsePersianInt(str: string): number | undefined {
  if (!str) return undefined
  // Replace Persian/Arabic digits with ASCII digits
  const normalised = str
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0))
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/[,،\s]/g, "")
  const n = parseInt(normalised, 10)
  return isNaN(n) ? undefined : n
}

// ─── Field mapper ──────────────────────────────────────────────────────────────

// These helpers each safely navigate the raw Divar response structure.
// The Divar API uses a widgets/sections pattern — each widget has a `widget_type`
// and a corresponding data blob. Structure may change; every access uses optional
// chaining so a changed schema degrades gracefully to undefined.

type Obj = Record<string, unknown>

function asObj(v: unknown): Obj | undefined {
  return v !== null && typeof v === "object" && !Array.isArray(v) ? (v as Obj) : undefined
}

function asArray(v: unknown): unknown[] | undefined {
  return Array.isArray(v) ? v : undefined
}

function asString(v: unknown): string | undefined {
  return typeof v === "string" ? v : undefined
}

/** Finds the first widget matching a given type inside the post widget_list */
function findWidget(data: Obj, widgetType: string): Obj | undefined {
  const sections = asArray(data["sections"])
  if (!sections) return undefined
  for (const sec of sections) {
    const section = asObj(sec)
    const widgets = asArray(section?.["widgets"])
    if (!widgets) continue
    for (const w of widgets) {
      const widget = asObj(w)
      if (widget?.["widget_type"] === widgetType) return widget
    }
  }
  return undefined
}

/** Extracts items from a GROUP_INFO_ROW or UNEXPANDABLE_ROW widget */
function getInfoItems(data: Obj): Obj[] {
  const items: Obj[] = []
  const sections = asArray(data["sections"])
  if (!sections) return items
  for (const sec of sections) {
    const section = asObj(sec)
    const widgets = asArray(section?.["widgets"])
    if (!widgets) continue
    for (const w of widgets) {
      const widget = asObj(w)
      const type = asString(widget?.["widget_type"])
      if (type === "GROUP_INFO_ROW" || type === "UNEXPANDABLE_ROW") {
        const inner = asArray(asObj(widget?.["data"])?.["items"])
        if (inner) inner.forEach((i) => { const o = asObj(i); if (o) items.push(o) })
      }
    }
  }
  return items
}

/** Finds the value of a named info item (e.g. "متراژ") */
function findInfoValue(items: Obj[], titlePattern: RegExp): string | undefined {
  for (const item of items) {
    const title = asString(item["title"])
    if (title && titlePattern.test(title)) {
      return asString(item["value"]) ?? asString(asObj(item["value"])?.["raw"])
    }
  }
  return undefined
}

/**
 * Maps a raw Divar API response to our DivarImportResult.
 * Every extraction is wrapped defensively — partial results are always returned.
 */
export function mapDivarToFileData(raw: unknown): DivarImportResult {
  const fields: DivarImportResult["fields"] = {}
  const photoUrls: string[] = []
  let filledCount = 0

  const data = asObj(raw)
  if (!data) {
    return { fields, photoUrls, filledCount: 0, missingRequired: ["contacts", "address"] }
  }

  // ── Category → transactionType + propertyType ───────────────────────────────
  try {
    const post = asObj(data["post"])
    const category = asObj(post?.["category"])
    const slug = asString(category?.["slug"])
    if (slug && DIVAR_CATEGORY_MAP[slug]) {
      const mapped = DIVAR_CATEGORY_MAP[slug]
      if (mapped.transactionType) { fields.transactionType = mapped.transactionType; filledCount++ }
      if (mapped.propertyType)    { fields.propertyType = mapped.propertyType; filledCount++ }
    }
  } catch { /* ignore */ }

  // ── Address / neighborhood ──────────────────────────────────────────────────
  try {
    const post = asObj(data["post"])
    const district = asString(asObj(post?.["districts"])?.[0] ?? asArray(post?.["districts"])?.[0])
    const city = asString(asObj(post?.["city"])?.["name"])
    const cityDistrict = asString(asObj(post?.["city_district"])?.["name"])

    let addr: string | undefined
    // Try location text from header or breadcrumb
    const header = asObj(findWidget(data, "UNEXPANDABLE_ROW"))
    const breadcrumb = asArray(data["breadcrumb"])
    if (breadcrumb && breadcrumb.length > 0) {
      const parts = breadcrumb
        .map((b) => asString(asObj(b)?.["title"]))
        .filter(Boolean) as string[]
      if (parts.length > 0) addr = parts.join("، ")
    }

    const neighborhood = cityDistrict ?? district
    if (neighborhood) { fields.neighborhood = neighborhood; filledCount++ }

    if (addr) { fields.address = addr; filledCount++ }
    else if (city && neighborhood) {
      fields.address = `${city}، ${neighborhood}`
      filledCount++
    } else if (city) {
      fields.address = city
      filledCount++
    }
  } catch { /* ignore */ }

  // ── Description ─────────────────────────────────────────────────────────────
  try {
    const descWidget = findWidget(data, "DESCRIPTION_ROW")
    const desc = asString(asObj(descWidget?.["data"])?.["text"])
    if (desc) { fields.description = desc; filledCount++ }
  } catch { /* ignore */ }

  // ── Info rows (متراژ، طبقه، کل طبقات، سن بنا، تعداد اتاق) ─────────────────
  const infoItems = getInfoItems(data)

  try {
    const areaStr = findInfoValue(infoItems, /متراژ/)
    const area = areaStr ? parsePersianInt(areaStr) : undefined
    if (area !== undefined) { fields.area = area; filledCount++ }
  } catch { /* ignore */ }

  try {
    const floorStr = findInfoValue(infoItems, /طبقه/)
    if (floorStr) {
      // May be "۳ از ۵" meaning floor 3 of 5
      const parts = floorStr.split(/از|of/i).map((s) => s.trim())
      const floor = parsePersianInt(parts[0] ?? "")
      const total = parts[1] ? parsePersianInt(parts[1]) : undefined
      if (floor !== undefined) { fields.floorNumber = floor; filledCount++ }
      if (total !== undefined) { fields.totalFloors = total; filledCount++ }
    }
  } catch { /* ignore */ }

  try {
    const ageStr = findInfoValue(infoItems, /سن بنا|قدمت بنا/)
    const age = ageStr ? parsePersianInt(ageStr) : undefined
    if (age !== undefined) { fields.buildingAge = age; filledCount++ }
  } catch { /* ignore */ }

  // rooms — no dedicated field in schema; append to notes
  let roomsNote: string | undefined
  try {
    const roomStr = findInfoValue(infoItems, /اتاق/)
    const rooms = roomStr ? parsePersianInt(roomStr) : undefined
    if (rooms !== undefined) roomsNote = `تعداد اتاق: ${rooms}`
  } catch { /* ignore */ }

  // ── Title → notes ────────────────────────────────────────────────────────────
  let titleNote: string | undefined
  try {
    const post = asObj(data["post"])
    const title = asString(post?.["title"])
    if (title) titleNote = `عنوان دیوار: ${title}`
  } catch { /* ignore */ }

  const noteParts = [titleNote, roomsNote].filter(Boolean)
  if (noteParts.length > 0) { fields.notes = noteParts.join("\n"); filledCount++ }

  // ── Price fields ─────────────────────────────────────────────────────────────
  try {
    const priceWidget = findWidget(data, "BARGAIN_ROW")
    const priceData = asObj(priceWidget?.["data"])

    // Sale price
    const totalPriceStr = asString(asObj(priceData?.["value"])?.["raw"]) ??
                          asString(priceData?.["value"])
    if (totalPriceStr && (fields.transactionType === "SALE" || !fields.transactionType)) {
      const price = parsePersianInt(totalPriceStr)
      if (price !== undefined) { fields.salePrice = price; filledCount++ }
    }

    // Deposit + rent
    const depositStr = asString(asObj(priceData?.["deposit"])?.["raw"]) ??
                       asString(priceData?.["deposit"])
    const rentStr    = asString(asObj(priceData?.["rent"])?.["raw"]) ??
                       asString(priceData?.["rent"])
    if (depositStr) {
      const deposit = parsePersianInt(depositStr)
      if (deposit !== undefined) { fields.depositAmount = deposit; filledCount++ }
    }
    if (rentStr) {
      const rent = parsePersianInt(rentStr)
      if (rent !== undefined) { fields.rentAmount = rent; filledCount++ }
    }
  } catch { /* ignore */ }

  // Also try EXTRA_DATA price fields which appear on some listing types
  try {
    const extraData = asObj(data["extra_data"])
    if (extraData) {
      const deposit = parsePersianInt(asString(extraData["odometer"] ?? extraData["deposit"]) ?? "")
      if (deposit !== undefined && !fields.depositAmount) { fields.depositAmount = deposit; filledCount++ }
    }
  } catch { /* ignore */ }

  // ── Amenities (boolean toggles) ──────────────────────────────────────────────
  try {
    const amenityWidget = findWidget(data, "FEATURE_ROW")
    const amenities = asArray(asObj(amenityWidget?.["data"])?.["items"]) ?? []
    for (const item of amenities) {
      const label = asString(asObj(item)?.["title"]) ?? ""
      if (/پارکینگ/.test(label)) { fields.hasParking = true; filledCount++ }
      if (/آسانسور/.test(label)) { fields.hasElevator = true; filledCount++ }
      if (/انباری/.test(label))  { fields.hasStorage = true; filledCount++ }
      if (/بالکن/.test(label))   { fields.hasBalcony = true; filledCount++ }
      if (/نگهبان|امنیت/.test(label)) { fields.hasSecurity = true; filledCount++ }
    }
  } catch { /* ignore */ }

  // ── Photos ────────────────────────────────────────────────────────────────────
  try {
    const post = asObj(data["post"])
    const images = asArray(post?.["images"])
    if (images) {
      for (const img of images) {
        const url = asString(asObj(img)?.["url"]) ?? asString(img)
        if (url) photoUrls.push(url)
      }
    }
  } catch { /* ignore */ }

  // ── Determine missing required fields ────────────────────────────────────────
  const missingRequired: string[] = ["contacts"] // contacts can never be auto-filled
  if (!fields.address) missingRequired.push("address")

  return { fields, photoUrls, filledCount, missingRequired }
}
