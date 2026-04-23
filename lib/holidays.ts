/**
 * Iranian public holidays for 1404 Shamsi (2025–2026 Gregorian).
 * Keys are ISO date strings ("YYYY-MM-DD") in UTC.
 * Islamic lunar holidays are pre-computed for 1404 — update this file annually.
 */
export const HOLIDAYS_1404: Record<string, string> = {
  "2025-03-21": "نوروز",
  "2025-03-22": "نوروز",
  "2025-03-23": "نوروز",
  "2025-03-24": "نوروز",
  "2025-04-01": "روز جمهوری اسلامی",
  "2025-04-02": "سیزده‌بدر",
  "2025-06-04": "رحلت امام خمینی",
  "2025-06-05": "قیام ۱۵ خرداد",
  "2025-10-04": "تاسوعای حسینی",
  "2025-10-05": "عاشورای حسینی",
  "2025-12-20": "اربعین حسینی",
  "2025-12-29": "رحلت پیامبر و شهادت امام حسن مجتبی",
  "2025-12-31": "شهادت امام رضا",
  "2026-02-11": "پیروزی انقلاب اسلامی",
  "2026-02-25": "شهادت حضرت فاطمه زهرا",
  "2026-03-19": "ملی‌شدن صنعت نفت",
  "2026-03-20": "پایان سال ۱۴۰۴",
}

function toIsoDateKey(date: Date): string {
  // Use local date parts to match how we store eventDate (no UTC shift)
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, "0")
  const d = String(date.getDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}

/** Returns the Persian holiday name for the given date, or null if not a holiday. */
export function getHolidayName(date: Date): string | null {
  return HOLIDAYS_1404[toIsoDateKey(date)] ?? null
}

/** Returns true if the given date is a Friday (always a day off in Iran). */
export function isFriday(date: Date): boolean {
  return date.getDay() === 5
}

/** Returns true if the given date is a day off (Friday or official holiday). */
export function isOffDay(date: Date): boolean {
  return isFriday(date) || getHolidayName(date) !== null
}
