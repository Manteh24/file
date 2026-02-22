import type { TransactionType } from "@/types"

export type ReportPeriod = "this_month" | "last_3_months" | "this_year" | "all"

export const PERIOD_OPTIONS: { value: ReportPeriod; label: string }[] = [
  { value: "this_year", label: "امسال" },
  { value: "last_3_months", label: "۳ ماه گذشته" },
  { value: "this_month", label: "این ماه" },
  { value: "all", label: "همه زمان‌ها" },
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
}

/** Falls back to the raw action string for unknown future action types. */
export function getActivityActionLabel(action: string): string {
  return ACTIVITY_ACTION_LABELS[action] ?? action
}
