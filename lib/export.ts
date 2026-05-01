// CSV export helper.
//
// Output starts with a UTF-8 BOM so Excel opens Persian text correctly.
// Numbers are kept as raw English digits (machine-readable downstream).
// Dates are formatted as Jalali "yyyy/MM/dd" using date-fns-jalali.

import { format } from "date-fns-jalali"

const BOM = "﻿"

export interface CsvColumn<T> {
  key: keyof T | string
  label: string
}

/**
 * Quote a single field if it contains a comma, double-quote, newline, or any
 * RTL-marker character. Inner double-quotes are escaped by doubling them.
 */
function quoteField(value: unknown): string {
  if (value === null || value === undefined) return ""
  const s = String(value)
  // Match: comma, double quote, CR, LF, or characters in the Arabic / Hebrew /
  // Persian ranges (which trip up some CSV consumers without explicit quoting).
  if (/[",\r\n֐-ࣿיִ-﷿ﹰ-﻿]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`
  }
  return s
}

export function toCsv<T extends Record<string, unknown>>(
  rows: T[],
  columns: CsvColumn<T>[]
): string {
  const header = columns.map((c) => quoteField(c.label)).join(",")
  const body = rows
    .map((row) =>
      columns.map((c) => quoteField(row[c.key as keyof T])).join(",")
    )
    .join("\n")
  return `${BOM}${header}\n${body}\n`
}

/** Format a Date (or null/undefined) as Jalali "yyyy/MM/dd". */
export function formatJalaliDate(d: Date | string | null | undefined): string {
  if (!d) return ""
  const date = d instanceof Date ? d : new Date(d)
  if (Number.isNaN(date.getTime())) return ""
  return format(date, "yyyy/MM/dd")
}

/** Build the `Content-Disposition` filename for an export — `<prefix>-YYYYMMDD.csv`. */
export function csvFilename(prefix: string): string {
  const now = new Date()
  const yyyy = now.getFullYear()
  const mm = String(now.getMonth() + 1).padStart(2, "0")
  const dd = String(now.getDate()).padStart(2, "0")
  return `${prefix}-${yyyy}${mm}${dd}.csv`
}

export function csvHeaders(filename: string): Record<string, string> {
  return {
    "Content-Type": "text/csv; charset=utf-8",
    "Content-Disposition": `attachment; filename="${filename}"`,
  }
}
