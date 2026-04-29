import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { format } from "date-fns-jalali"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Formats an integer Toman amount into a Persian-numeral display string.
 * Example: 5000000 → "۵,۰۰۰,۰۰۰ تومان"
 */
export function formatToman(amount: bigint | number): string {
  return `${Number(amount).toLocaleString("fa-IR")} تومان`
}

// Recursive type that replaces bigint with number in deeply nested structures.
// Used with bigIntToNumber() to satisfy TypeScript after Prisma BigInt columns are converted.
type BigIntToNumber<T> = T extends bigint
  ? number
  : T extends Date
    ? Date
    : T extends Array<infer U>
      ? Array<BigIntToNumber<U>>
      : T extends object
        ? { [K in keyof T]: BigIntToNumber<T[K]> }
        : T

/**
 * Recursively converts BigInt values to Number so objects can be JSON-serialised.
 * Prisma returns BigInt for columns declared as `BigInt` in the schema.
 * JavaScript's Number safely represents integers up to 2^53, which covers all
 * realistic Iranian real estate prices (max ~500 billion Toman ≪ 9 quadrillion).
 */
export function bigIntToNumber<T>(value: T): BigIntToNumber<T> {
  if (typeof value === "bigint") return Number(value) as BigIntToNumber<T>
  if (value instanceof Date) return value as BigIntToNumber<T>
  if (Array.isArray(value)) return value.map(bigIntToNumber) as BigIntToNumber<T>
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([k, v]) => [k, bigIntToNumber(v)])
    ) as BigIntToNumber<T>
  }
  return value as BigIntToNumber<T>
}

/**
 * Formats a Gregorian Date into a Jalali display string with Persian numerals.
 * Always use this for displaying dates to end users — never show Gregorian dates.
 * Example: new Date("2026-02-19") → "۱۴۰۴/۱۱/۳۰"
 *
 * Note: date-fns-jalali emits Latin digits regardless of locale, so we convert
 * them to Persian (Extended Arabic-Indic) numerals (U+06F0–U+06F9) after formatting.
 */
export function formatJalali(date: Date, fmt = "yyyy/MM/dd"): string {
  const result = format(date, fmt)
  return result.replace(/[0-9]/g, (c) =>
    String.fromCharCode(c.charCodeAt(0) + 0x06f0 - 0x30)
  )
}

/**
 * Formats a Toman amount for chart Y-axis ticks — compact, Persian-numeral.
 * Tiers: 0 → ۰ | <1M → locale string | ≥1M → N م | ≥1B → N م‌م
 * Example: 5_500_000 → "۵.۵ م"
 */
export function formatTomanAxis(value: number): string {
  if (value === 0) return "۰"
  if (value >= 1_000_000_000) {
    return `${(value / 1_000_000_000).toLocaleString("fa-IR", { maximumFractionDigits: 1 })} م‌م`
  }
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toLocaleString("fa-IR", { maximumFractionDigits: 1 })} م`
  }
  return value.toLocaleString("fa-IR")
}

/**
 * Converts a number to its Farsi-digit string representation.
 * Example: 120 → "۱۲۰"
 */
export function toFarsiDigits(n: number): string {
  return n.toString().replace(/\d/g, (d) =>
    String.fromCharCode(d.charCodeAt(0) + 0x06f0 - 0x30)
  )
}

/**
 * Parses a string containing Farsi or Latin digits into an integer.
 * Returns undefined if the string is empty or not a valid integer.
 * Example: "۱۲۰" → 120, "120" → 120, "" → undefined
 */
export function parseFarsiNumber(v: string): number | undefined {
  if (!v.trim()) return undefined
  // Convert Farsi/Extended Arabic-Indic digits (U+06F0–U+06F9) to ASCII
  const latin = v.replace(/[\u06F0-\u06F9]/g, (c) =>
    String(c.charCodeAt(0) - 0x06f0)
  )
  const n = parseInt(latin, 10)
  return isNaN(n) ? undefined : n
}

/**
 * Normalizes Iranian phone numbers pasted from contact apps into canonical
 * `0XXXXXXXXXX` form before regex validation. Does not validate length —
 * downstream Zod regex handles that.
 *
 * Handles Persian and Arabic-Indic digits, spaces, dashes, dots, parens,
 * and leading `+98` / `0098` / bare `98`.
 */
export function normalizePhone(input: string): string {
  const ascii = input
    .replace(/[۰-۹]/g, (c) => String(c.charCodeAt(0) - 0x06f0))
    .replace(/[٠-٩]/g, (c) => String(c.charCodeAt(0) - 0x0660))
  const trimmed = ascii.trim()
  const hasPlus = trimmed.startsWith("+")
  const digits = trimmed.replace(/[^\d]/g, "")
  if (hasPlus && digits.startsWith("98")) return "0" + digits.slice(2)
  if (digits.startsWith("0098")) return "0" + digits.slice(4)
  if (digits.startsWith("98") && digits.length === 12) return "0" + digits.slice(2)
  return digits
}
