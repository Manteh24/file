import { describe, it, expect } from "vitest"
import { formatToman, formatJalali } from "@/lib/utils"

// toLocaleString("fa-IR") uses the Arabic Thousands Separator ٬ (U+066C),
// not the ASCII comma. These strings are exact copies of actual runtime output.
describe("formatToman", () => {
  it("formats a typical amount with Persian numerals and Toman suffix", () => {
    expect(formatToman(5000000)).toBe("۵٬۰۰۰٬۰۰۰ تومان")
  })

  it("formats zero", () => {
    expect(formatToman(0)).toBe("۰ تومان")
  })

  it("formats a small amount without thousands separator", () => {
    expect(formatToman(500)).toBe("۵۰۰ تومان")
  })

  it("formats a large amount with multiple separator groups", () => {
    expect(formatToman(1000000000)).toBe("۱٬۰۰۰٬۰۰۰٬۰۰۰ تومان")
  })

  it("formats 1000 with a single thousands separator", () => {
    expect(formatToman(1000)).toBe("۱٬۰۰۰ تومان")
  })
})

describe("formatJalali", () => {
  it("converts a known Gregorian date to the correct Jalali string", () => {
    // 2026-02-19 Gregorian = 1404/11/30 Jalali (Bahman 30, 1404)
    const date = new Date("2026-02-19T00:00:00.000Z")
    expect(formatJalali(date)).toBe("۱۴۰۴/۱۱/۳۰")
  })

  it("converts the first day of the Jalali year correctly", () => {
    // 2026-03-21 Gregorian = 1405/01/01 Jalali (Nowruz)
    const date = new Date("2026-03-21T00:00:00.000Z")
    expect(formatJalali(date)).toBe("۱۴۰۵/۰۱/۰۱")
  })

  it("respects a custom format string", () => {
    const date = new Date("2026-02-19T00:00:00.000Z")
    // Only the year
    expect(formatJalali(date, "yyyy")).toBe("۱۴۰۴")
  })
})
