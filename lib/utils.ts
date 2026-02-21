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
