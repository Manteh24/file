import type { TransactionType } from "@/types"
import { format } from "date-fns-jalali"

const JALALI_MONTH_SHORT = [
  "", "فرو", "ارد", "خرد", "تیر", "مرد", "شهر",
  "مهر", "آبا", "آذر", "دی", "بهم", "اسف",
]

export type ReportPeriod = "this_month" | "last_3_months" | "this_year" | "all"

export const PERIOD_OPTIONS: { value: ReportPeriod; label: string }[] = [
  { value: "this_month", label: "یک ماه" },
  { value: "last_3_months", label: "سه ماه" },
  { value: "this_year", label: "یک سال" },
  { value: "all", label: "از آغاز" },
]

const VALID_PERIODS: ReportPeriod[] = [
  "this_month",
  "last_3_months",
  "this_year",
  "all",
]

/**
 * Validates a searchParam value against the whitelist.
 * Falls back to "this_year" for any unrecognised or absent value.
 */
export function normalisePeriod(raw: string | undefined): ReportPeriod {
  if (raw && VALID_PERIODS.includes(raw as ReportPeriod)) {
    return raw as ReportPeriod
  }
  return "this_year"
}

/**
 * Returns a Gregorian start Date for the given period filter.
 * Returns undefined for "all" (no date restriction).
 * Unrecognised or absent values default to "this_year".
 */
export function getDateFilter(period: string | undefined): Date | undefined {
  const resolved = normalisePeriod(period)
  const now = new Date()

  switch (resolved) {
    case "all":
      return undefined
    case "this_month":
      return new Date(now.getFullYear(), now.getMonth(), 1)
    case "last_3_months": {
      // Start from midnight local time today, then subtract 3 months
      // so the result is consistent with the start-of-day used by other periods.
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      d.setMonth(d.getMonth() - 3)
      return d
    }
    case "this_year":
    default:
      return new Date(now.getFullYear(), 0, 1)
  }
}

export const TRANSACTION_TYPE_LABELS: Record<TransactionType, string> = {
  SALE: "فروش",
  PRE_SALE: "پیش‌فروش",
  LONG_TERM_RENT: "اجاره بلندمدت",
  SHORT_TERM_RENT: "اجاره کوتاه‌مدت",
}

export function getTransactionTypeLabel(type: TransactionType): string {
  return TRANSACTION_TYPE_LABELS[type]
}

export const ACTIVITY_ACTION_LABELS: Record<string, string> = {
  CREATE: "ایجاد فایل",
  EDIT: "ویرایش",
  STATUS_CHANGE: "تغییر وضعیت",
  ASSIGNMENT: "تخصیص مشاور",
  SHARE_LINK: "ارسال لینک",
  CONTRACT_FINALIZED: "ثبت قرارداد",
}

/** Falls back to the raw action string for unknown future action types. */
export function getActivityActionLabel(action: string): string {
  return ACTIVITY_ACTION_LABELS[action] ?? action
}

export const FILE_STATUS_LABELS: Record<string, string> = {
  ACTIVE: "فعال",
  SOLD: "فروخته شده",
  RENTED: "اجاره داده شده",
  ARCHIVED: "آرشیو",
  EXPIRED: "منقضی شده",
}

export const PROPERTY_TYPE_LABELS: Record<string, string> = {
  APARTMENT: "آپارتمان",
  HOUSE: "خانه",
  VILLA: "ویلا",
  LAND: "زمین",
  COMMERCIAL: "تجاری",
  OFFICE: "اداری",
  OTHER: "سایر",
}

/**
 * Groups an array of items by Jalali year/month key (e.g. "1404/02").
 * dateKey must be a field name that contains a Date or ISO string value.
 * Returns entries sorted chronologically by key.
 */
export function groupByJalaliMonth<T extends Record<string, unknown>>(
  items: T[],
  dateKey: keyof T
): { key: string; label: string; items: T[] }[] {
  const map = new Map<string, { label: string; items: T[] }>()
  for (const item of items) {
    const raw = item[dateKey]
    const date = raw instanceof Date ? raw : new Date(raw as string)
    const key = format(date, "yyyy/MM") // Jalali sort key
    const monthNum = parseInt(format(date, "M"), 10)
    const label = JALALI_MONTH_SHORT[monthNum] ?? String(monthNum)
    if (!map.has(key)) map.set(key, { label, items: [] })
    map.get(key)!.items.push(item)
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, v]) => ({ key, label: v.label, items: v.items }))
}

/** Returns delta between current and previous values as a number and direction string. */
export function calcDelta(
  current: number,
  previous: number
): { delta: number; percent: number; direction: "up" | "down" | "same" } {
  if (previous === 0 && current === 0) return { delta: 0, percent: 0, direction: "same" }
  if (previous === 0) return { delta: current, percent: 100, direction: "up" }
  const delta = current - previous
  const percent = Math.round((delta / previous) * 100)
  return {
    delta,
    percent: Math.abs(percent),
    direction: delta > 0 ? "up" : delta < 0 ? "down" : "same",
  }
}
