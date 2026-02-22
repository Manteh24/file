import { describe, it, expect, vi, afterEach } from "vitest"
import {
  getDateFilter,
  normalisePeriod,
  getTransactionTypeLabel,
  getActivityActionLabel,
  PERIOD_OPTIONS,
  type ReportPeriod,
} from "@/app/(dashboard)/reports/helpers"

// All date-sensitive tests pin the clock to 2026-02-22T12:00:00.000Z
const FIXED_NOW = new Date("2026-02-22T12:00:00.000Z")

afterEach(() => {
  vi.useRealTimers()
})

// ─── getDateFilter ────────────────────────────────────────────────────────────

describe("getDateFilter", () => {
  it("this_month returns the first day of the current month", () => {
    vi.useFakeTimers()
    vi.setSystemTime(FIXED_NOW)

    const result = getDateFilter("this_month")
    // Feb 2026 → Feb 1, 2026
    expect(result).toEqual(new Date(2026, 1, 1))
  })

  it("last_3_months returns exactly 3 calendar months ago", () => {
    vi.useFakeTimers()
    vi.setSystemTime(FIXED_NOW)

    const result = getDateFilter("last_3_months")
    // Feb 22 − 3 months = Nov 22, 2025
    expect(result).toEqual(new Date(2025, 10, 22))
  })

  it("this_year returns January 1st of the current year", () => {
    vi.useFakeTimers()
    vi.setSystemTime(FIXED_NOW)

    const result = getDateFilter("this_year")
    expect(result).toEqual(new Date(2026, 0, 1))
  })

  it("all returns undefined (no date restriction)", () => {
    vi.useFakeTimers()
    vi.setSystemTime(FIXED_NOW)

    expect(getDateFilter("all")).toBeUndefined()
  })

  it("an unrecognised string defaults to this_year", () => {
    vi.useFakeTimers()
    vi.setSystemTime(FIXED_NOW)

    const result = getDateFilter("weekly")
    expect(result).toEqual(new Date(2026, 0, 1))
  })

  it("undefined defaults to this_year", () => {
    vi.useFakeTimers()
    vi.setSystemTime(FIXED_NOW)

    const result = getDateFilter(undefined)
    expect(result).toEqual(new Date(2026, 0, 1))
  })

  it("month wrap: last_3_months from January crosses into previous year", () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-01-22T12:00:00.000Z"))

    const result = getDateFilter("last_3_months")
    // Jan 22 2026 − 3 months = Oct 22, 2025
    expect(result).toEqual(new Date(2025, 9, 22))
  })
})

// ─── normalisePeriod ──────────────────────────────────────────────────────────

describe("normalisePeriod", () => {
  it("passes through 'this_month'", () => {
    expect(normalisePeriod("this_month")).toBe<ReportPeriod>("this_month")
  })

  it("passes through 'last_3_months'", () => {
    expect(normalisePeriod("last_3_months")).toBe<ReportPeriod>("last_3_months")
  })

  it("passes through 'this_year'", () => {
    expect(normalisePeriod("this_year")).toBe<ReportPeriod>("this_year")
  })

  it("passes through 'all'", () => {
    expect(normalisePeriod("all")).toBe<ReportPeriod>("all")
  })

  it("returns 'this_year' for an invalid string", () => {
    expect(normalisePeriod("bogus")).toBe<ReportPeriod>("this_year")
  })

  it("returns 'this_year' for undefined", () => {
    expect(normalisePeriod(undefined)).toBe<ReportPeriod>("this_year")
  })
})

// ─── getTransactionTypeLabel ──────────────────────────────────────────────────

describe("getTransactionTypeLabel", () => {
  it("maps SALE to 'فروش'", () => {
    expect(getTransactionTypeLabel("SALE")).toBe("فروش")
  })

  it("maps PRE_SALE to 'پیش‌فروش'", () => {
    expect(getTransactionTypeLabel("PRE_SALE")).toBe("پیش‌فروش")
  })

  it("maps LONG_TERM_RENT to 'اجاره بلندمدت'", () => {
    expect(getTransactionTypeLabel("LONG_TERM_RENT")).toBe("اجاره بلندمدت")
  })

  it("maps SHORT_TERM_RENT to 'اجاره کوتاه‌مدت'", () => {
    expect(getTransactionTypeLabel("SHORT_TERM_RENT")).toBe("اجاره کوتاه‌مدت")
  })
})

// ─── getActivityActionLabel ───────────────────────────────────────────────────

describe("getActivityActionLabel", () => {
  it.each([
    ["CREATE", "ایجاد فایل"],
    ["EDIT", "ویرایش"],
    ["STATUS_CHANGE", "تغییر وضعیت"],
    ["ASSIGNMENT", "تخصیص مشاور"],
    ["SHARE_LINK", "ارسال لینک"],
  ])("maps %s to the correct Persian label", (action, expected) => {
    expect(getActivityActionLabel(action)).toBe(expected)
  })

  it("falls back to the raw action string for unknown action types", () => {
    expect(getActivityActionLabel("UNKNOWN_FUTURE_ACTION")).toBe(
      "UNKNOWN_FUTURE_ACTION"
    )
  })
})

// ─── PERIOD_OPTIONS ───────────────────────────────────────────────────────────

describe("PERIOD_OPTIONS", () => {
  it("has exactly 4 options", () => {
    expect(PERIOD_OPTIONS).toHaveLength(4)
  })

  it("contains all four expected period values", () => {
    const values = PERIOD_OPTIONS.map((o) => o.value)
    expect(values).toContain("this_year")
    expect(values).toContain("last_3_months")
    expect(values).toContain("this_month")
    expect(values).toContain("all")
  })

  it("all options have non-empty labels", () => {
    for (const opt of PERIOD_OPTIONS) {
      expect(opt.label.length).toBeGreaterThan(0)
    }
  })
})
