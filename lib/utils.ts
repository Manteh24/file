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
export function formatToman(amount: number): string {
  return `${amount.toLocaleString("fa-IR")} تومان`
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
