"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams, usePathname } from "next/navigation"
import Link from "next/link"
import { format, parse } from "date-fns-jalali"
import { formatToman } from "@/lib/utils"
import type { AdminPaymentSummary, Plan, BillingCycle } from "@/types"

/** Converts a Gregorian "YYYY-MM-DD" string → Jalali "yyyy/MM/dd" display string. */
function toJalali(gregorianStr: string): string {
  if (!gregorianStr) return ""
  try {
    return format(new Date(gregorianStr), "yyyy/MM/dd")
  } catch {
    return ""
  }
}

/** Converts a Jalali "yyyy/MM/dd" string → Gregorian "YYYY-MM-DD" for URL params. */
function toGregorian(jalaliStr: string): string {
  const trimmed = jalaliStr.trim()
  if (!trimmed) return ""
  try {
    const date = parse(trimmed, "yyyy/MM/dd", new Date())
    if (isNaN(date.getTime())) return ""
    const y = date.getFullYear()
    const m = String(date.getMonth() + 1).padStart(2, "0")
    const d = String(date.getDate()).padStart(2, "0")
    return `${y}-${m}-${d}`
  } catch {
    return ""
  }
}

const PLAN_LABELS: Record<Plan, string> = { FREE: "رایگان", PRO: "حرفه‌ای", TEAM: "تیم" }
const CYCLE_LABELS: Record<BillingCycle, string> = { MONTHLY: "ماهانه", ANNUAL: "سالانه" }
const STATUS_LABELS: Record<string, string> = {
  PENDING: "در انتظار",
  VERIFIED: "تأیید شده",
  FAILED: "ناموفق",
}
const STATUS_COLORS: Record<string, string> = {
  PENDING: "text-muted-foreground",
  VERIFIED: "text-green-600",
  FAILED: "text-red-600",
}

interface PaymentsTableProps {
  payments: AdminPaymentSummary[]
  total: number
  page: number
  limit: number
  summary: { verifiedAmountToman: number; failedCount: number }
}

export function PaymentsTable({ payments, total, page, limit, summary }: PaymentsTableProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  function updateParam(key: string, value: string | null) {
    const params = new URLSearchParams(searchParams.toString())
    if (value === null || value === "") {
      params.delete(key)
    } else {
      params.set(key, value)
    }
    params.set("page", "1")
    router.push(`${pathname}?${params.toString()}`)
  }

  const currentStatus = searchParams.get("status") ?? ""
  const currentDateFrom = searchParams.get("dateFrom") ?? ""
  const currentDateTo = searchParams.get("dateTo") ?? ""
  const totalPages = Math.ceil(total / limit)

  // Local state holds the Jalali text the user is typing; syncs from URL params.
  const [jalaliFrom, setJalaliFrom] = useState(() => toJalali(currentDateFrom))
  const [jalaliTo, setJalaliTo] = useState(() => toJalali(currentDateTo))

  useEffect(() => { setJalaliFrom(toJalali(currentDateFrom)) }, [currentDateFrom])
  useEffect(() => { setJalaliTo(toJalali(currentDateTo)) }, [currentDateTo])

  function applyDate(jalaliStr: string, paramName: string) {
    const gregorian = toGregorian(jalaliStr)
    updateParam(paramName, gregorian || null)
  }

  function buildExportUrl() {
    const params = new URLSearchParams(searchParams.toString())
    params.delete("page")
    params.delete("limit")
    return `/api/admin/payments/export?${params.toString()}`
  }

  return (
    <div className="space-y-4">
      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-xl border-2 border-green-400 bg-card p-4">
          <p className="text-xs text-muted-foreground mb-1">درآمد تأییدشده (فیلتر فعلی)</p>
          <p className="text-xl font-bold tabular-nums">{formatToman(summary.verifiedAmountToman)}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground mb-1">کل تراکنش‌ها</p>
          <p className="text-xl font-bold tabular-nums">{total.toLocaleString("fa-IR")}</p>
        </div>
        <div className="rounded-xl border-2 border-red-400 bg-card p-4">
          <p className="text-xs text-muted-foreground mb-1">پرداخت‌های ناموفق</p>
          <p className="text-xl font-bold tabular-nums">{summary.failedCount.toLocaleString("fa-IR")}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        {/* Status */}
        <select
          value={currentStatus}
          onChange={(e) => updateParam("status", e.target.value || null)}
          className="rounded-lg border border-input bg-background px-3 py-1.5 text-sm focus:outline-none"
        >
          <option value="">همه وضعیت‌ها</option>
          <option value="PENDING">در انتظار</option>
          <option value="VERIFIED">تأیید شده</option>
          <option value="FAILED">ناموفق</option>
        </select>

        {/* Date range — Jalali text inputs (e.g. 1404/01/15); applied on blur or Enter */}
        <div className="flex items-center gap-2 text-sm">
          <label className="text-muted-foreground text-xs">از:</label>
          <input
            type="text"
            dir="ltr"
            placeholder="۱۴۰۴/۰۱/۰۱"
            value={jalaliFrom}
            onChange={(e) => setJalaliFrom(e.target.value)}
            onBlur={() => applyDate(jalaliFrom, "dateFrom")}
            onKeyDown={(e) => { if (e.key === "Enter") applyDate(jalaliFrom, "dateFrom") }}
            className="w-28 rounded-lg border border-input bg-background px-3 py-1 text-sm focus:outline-none"
          />
          <label className="text-muted-foreground text-xs">تا:</label>
          <input
            type="text"
            dir="ltr"
            placeholder="۱۴۰۴/۱۲/۲۹"
            value={jalaliTo}
            onChange={(e) => setJalaliTo(e.target.value)}
            onBlur={() => applyDate(jalaliTo, "dateTo")}
            onKeyDown={(e) => { if (e.key === "Enter") applyDate(jalaliTo, "dateTo") }}
            className="w-28 rounded-lg border border-input bg-background px-3 py-1 text-sm focus:outline-none"
          />
        </div>

        {(currentStatus || currentDateFrom || currentDateTo) && (
          <button
            onClick={() => {
              const params = new URLSearchParams()
              router.push(`${pathname}?${params.toString()}`)
            }}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            پاک کردن فیلترها
          </button>
        )}

        {/* Export */}
        <a
          href={buildExportUrl()}
          className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium hover:bg-muted transition-colors"
        >
          دانلود CSV
        </a>
      </div>

      {/* Table */}
      {payments.length === 0 ? (
        <p className="text-sm text-muted-foreground py-8 text-center">هیچ پرداختی یافت نشد</p>
      ) : (
        <div className="rounded-xl border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/40 border-b border-border">
                <th className="px-4 py-2.5 text-start font-medium text-muted-foreground">تاریخ</th>
                <th className="px-4 py-2.5 text-start font-medium text-muted-foreground">دفتر</th>
                <th className="px-4 py-2.5 text-start font-medium text-muted-foreground">پلن</th>
                <th className="px-4 py-2.5 text-start font-medium text-muted-foreground">چرخه</th>
                <th className="px-4 py-2.5 text-start font-medium text-muted-foreground">مبلغ</th>
                <th className="px-4 py-2.5 text-start font-medium text-muted-foreground">وضعیت</th>
                <th className="px-4 py-2.5 text-start font-medium text-muted-foreground">شماره مرجع</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {payments.map((p) => (
                <tr key={p.id} className="hover:bg-muted/20">
                  <td className="px-4 py-2.5 tabular-nums text-muted-foreground">
                    {format(new Date(p.createdAt), "yyyy/MM/dd")}
                  </td>
                  <td className="px-4 py-2.5">
                    <Link href={`/admin/offices/${p.officeId}`} className="hover:underline font-medium">
                      {p.officeName}
                    </Link>
                  </td>
                  <td className="px-4 py-2.5">{PLAN_LABELS[p.plan]}</td>
                  <td className="px-4 py-2.5 text-muted-foreground">{CYCLE_LABELS[p.billingCycle]}</td>
                  <td className="px-4 py-2.5 tabular-nums font-medium">{formatToman(p.amountToman)}</td>
                  <td className={`px-4 py-2.5 font-medium ${STATUS_COLORS[p.status] ?? ""}`}>
                    {STATUS_LABELS[p.status] ?? p.status}
                  </td>
                  <td className="px-4 py-2.5 font-mono text-xs text-muted-foreground">
                    {p.refId ?? "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>صفحه {page.toLocaleString("fa-IR")} از {totalPages.toLocaleString("fa-IR")}</span>
          <div className="flex gap-2">
            <button
              onClick={() => updateParam("page", String(page - 1))}
              disabled={page <= 1}
              className="rounded px-3 py-1 border border-border disabled:opacity-40 hover:bg-muted"
            >
              قبلی
            </button>
            <button
              onClick={() => updateParam("page", String(page + 1))}
              disabled={page >= totalPages}
              className="rounded px-3 py-1 border border-border disabled:opacity-40 hover:bg-muted"
            >
              بعدی
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
