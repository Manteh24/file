import type { TransactionType, PropertyType } from "@/types"

// ─── Types ─────────────────────────────────────────────────────────────────────

export type DescriptionTone = "honest" | "neutral" | "optimistic"

export interface DescriptionInput {
  transactionType: TransactionType
  propertyType?: PropertyType | null
  area?: number | null
  floorNumber?: number | null
  totalFloors?: number | null
  buildingAge?: number | null
  salePrice?: number | null
  depositAmount?: number | null
  rentAmount?: number | null
  address?: string | null
  neighborhood?: string | null
  hasElevator?: boolean
  hasParking?: boolean
  hasStorage?: boolean
  hasBalcony?: boolean
  hasSecurity?: boolean
}

export interface DescriptionResult {
  success: boolean
  description?: string
  // true when the LLM was unavailable and we fell back to the static template
  usedFallback?: boolean
  error?: string
}

// ─── Label Maps ────────────────────────────────────────────────────────────────

const TRANSACTION_LABELS: Record<TransactionType, string> = {
  SALE: "فروش",
  LONG_TERM_RENT: "اجاره بلندمدت",
  SHORT_TERM_RENT: "اجاره کوتاه‌مدت",
  PRE_SALE: "پیش‌فروش",
}

const PROPERTY_LABELS: Record<PropertyType, string> = {
  APARTMENT: "آپارتمان",
  HOUSE: "خانه",
  VILLA: "ویلا",
  LAND: "زمین",
  COMMERCIAL: "مغازه",
  OFFICE: "دفتر",
  OTHER: "ملک",
}

// Tone modifier injected into the LLM prompt
const TONE_INSTRUCTIONS: Record<DescriptionTone, string> = {
  honest: "صادقانه و بی‌پرده، بدون اغراق",
  neutral: "خنثی و متوازن، حرفه‌ای",
  optimistic: "مثبت و جذاب، با تاکید بر مزایا",
}

// ─── Template Fallback ─────────────────────────────────────────────────────────

/**
 * Builds a plain Persian description from file data.
 * Used as the primary fallback when AvalAI is unreachable or returns an empty response.
 * This is a pure function — no I/O, always returns a non-empty string.
 */
export function buildDescriptionTemplate(
  input: DescriptionInput,
  tone: DescriptionTone
): string {
  const propertyLabel = input.propertyType ? PROPERTY_LABELS[input.propertyType] : "ملک"
  const isForSale =
    input.transactionType === "SALE" || input.transactionType === "PRE_SALE"
  const transactionLabel = TRANSACTION_LABELS[input.transactionType]

  const parts: string[] = []

  // Opening: property type + transaction + location
  const locationNote = input.neighborhood
    ? ` در محله ${input.neighborhood}`
    : input.address
    ? ` در ${input.address}`
    : ""
  parts.push(
    `${propertyLabel} ${isForSale ? "جهت فروش" : `جهت ${transactionLabel}`}${locationNote}.`
  )

  // Physical details
  const details: string[] = []
  if (input.area) details.push(`متراژ ${input.area} متر مربع`)
  if (input.floorNumber != null && input.totalFloors != null) {
    details.push(`طبقه ${input.floorNumber} از ${input.totalFloors}`)
  } else if (input.floorNumber != null) {
    details.push(`طبقه ${input.floorNumber}`)
  }
  if (input.buildingAge != null) {
    details.push(input.buildingAge === 0 ? "نوساز" : `${input.buildingAge} سال ساخت`)
  }
  if (details.length > 0) {
    parts.push(details.join("، ") + ".")
  }

  // Amenities
  const amenities: string[] = []
  if (input.hasParking) amenities.push("پارکینگ")
  if (input.hasStorage) amenities.push("انباری")
  if (input.hasElevator) amenities.push("آسانسور")
  if (input.hasBalcony) amenities.push("بالکن")
  if (input.hasSecurity) amenities.push("نگهبانی")
  if (amenities.length > 0) {
    if (tone === "optimistic") {
      parts.push(`این ملک دارای ${amenities.join("، ")} می‌باشد.`)
    } else {
      parts.push(`امکانات: ${amenities.join("، ")}.`)
    }
  }

  // Tone-based closing
  if (tone === "optimistic") {
    parts.push("برای کسب اطلاعات بیشتر و هماهنگی بازدید با مشاور تماس بگیرید.")
  } else {
    parts.push("برای بازدید و اطلاعات بیشتر با مشاور در تماس باشید.")
  }

  return parts.join(" ")
}

// ─── AvalAI Prompt Builder ─────────────────────────────────────────────────────

function buildPrompt(input: DescriptionInput, tone: DescriptionTone): string {
  const propertyLabel = input.propertyType ? PROPERTY_LABELS[input.propertyType] : "ملک"
  const transactionLabel = TRANSACTION_LABELS[input.transactionType]
  const toneInstruction = TONE_INSTRUCTIONS[tone]

  const details: string[] = []
  if (input.area) details.push(`- متراژ: ${input.area} متر`)
  if (input.floorNumber != null) details.push(`- طبقه: ${input.floorNumber}`)
  if (input.totalFloors != null) details.push(`- کل طبقات: ${input.totalFloors}`)
  if (input.buildingAge != null) {
    details.push(`- سن بنا: ${input.buildingAge === 0 ? "نوساز" : `${input.buildingAge} سال`}`)
  }
  if (input.neighborhood) details.push(`- محله: ${input.neighborhood}`)
  if (input.address) details.push(`- آدرس: ${input.address}`)

  const amenities: string[] = []
  if (input.hasParking) amenities.push("پارکینگ")
  if (input.hasStorage) amenities.push("انباری")
  if (input.hasElevator) amenities.push("آسانسور")
  if (input.hasBalcony) amenities.push("بالکن")
  if (input.hasSecurity) amenities.push("نگهبانی")
  if (amenities.length > 0) details.push(`- امکانات: ${amenities.join("، ")}`)

  const detailBlock = details.length > 0 ? `\n\nمشخصات ملک:\n${details.join("\n")}` : ""

  return (
    `یک توضیحات کوتاه (۲ تا ۴ جمله) برای آگهی ${transactionLabel} ${propertyLabel} به فارسی بنویس. ` +
    `لحن ${toneInstruction}. فقط متن توضیحات را بنویس، بدون عنوان یا توضیح اضافه.` +
    detailBlock
  )
}

// ─── AvalAI API Call ───────────────────────────────────────────────────────────

/**
 * Generates a Persian property description via AvalAI (OpenAI-compatible API).
 * Falls back to buildDescriptionTemplate() if:
 *   - AVALAI_API_KEY is not set
 *   - The HTTP request fails
 *   - The response is empty or malformed
 *   - The request times out (15s)
 * Never throws.
 */
export async function generateDescription(
  input: DescriptionInput,
  tone: DescriptionTone
): Promise<DescriptionResult> {
  const apiKey = process.env.AVALAI_API_KEY

  if (!apiKey) {
    console.warn("[ai] AVALAI_API_KEY not configured — using template fallback")
    return {
      success: true,
      description: buildDescriptionTemplate(input, tone),
      usedFallback: true,
    }
  }

  const prompt = buildPrompt(input, tone)

  try {
    const response = await fetch("https://api.avalai.ir/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 500,
        // Vary temperature by tone: honest = precise, optimistic = creative
        temperature: tone === "optimistic" ? 0.8 : tone === "honest" ? 0.3 : 0.5,
      }),
      signal: AbortSignal.timeout(15000),
    })

    if (!response.ok) {
      console.error("[ai] AvalAI HTTP error:", response.status)
      return {
        success: true,
        description: buildDescriptionTemplate(input, tone),
        usedFallback: true,
      }
    }

    const data = (await response.json()) as {
      choices?: { message?: { content?: string } }[]
    }

    const text = data.choices?.[0]?.message?.content?.trim()
    if (!text) {
      console.error("[ai] AvalAI returned empty content")
      return {
        success: true,
        description: buildDescriptionTemplate(input, tone),
        usedFallback: true,
      }
    }

    return { success: true, description: text, usedFallback: false }
  } catch (err) {
    console.error("[ai] AvalAI request failed:", err)
    return {
      success: true,
      description: buildDescriptionTemplate(input, tone),
      usedFallback: true,
    }
  }
}
