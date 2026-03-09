"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { format } from "date-fns-jalali"
import { ArrowRight, Check } from "lucide-react"
import { formatToman } from "@/lib/utils"

interface ReferredOffice {
  id: string
  name: string
  createdAt: string
  subscription: { plan: string; status: string; isTrial: boolean } | null
}

interface MonthlyEarning {
  id: string
  yearMonth: string
  activeOfficeCount: number
  commissionAmount: number
  isPaid: boolean
  paidAt: string | null
  paidByAdmin: { displayName: string } | null
}

interface CodeDetail {
  id: string
  code: string
  label: string | null
  office: { id: string; name: string } | null
  commissionPerOfficePerMonth: number
  isActive: boolean
  activeOfficeCount: number
  referrals: Array<{ office: ReferredOffice }>
  monthlyEarnings: MonthlyEarning[]
}

// Build last 6 months: Jalali label, Gregorian YYYY-MM value (API format)
function buildMonthOptions(): { label: string; value: string }[] {
  const now = new Date()
  const options: { label: string; value: string }[] = []
  for (let i = 0; i < 6; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    options.push({
      label: format(d, "MMMM yyyy"), // e.g. "اسفند ۱۴۰۴"
      value: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
    })
  }
  return options
}

export default function ReferralCodeDetailPage() {
  const params = useParams()
  const codeId = params.codeId as string

  const monthOptions = buildMonthOptions()
  const [data, setData] = useState<CodeDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [snapshotMonth, setSnapshotMonth] = useState(monthOptions[0].value)
  const [snapshotLoading, setSnapshotLoading] = useState(false)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [msg, setMsg] = useState<string | null>(null)

  async function load() {
    const res = await fetch(`/api/admin/referral-codes/${codeId}`)
    const json = await res.json()
    if (json.success) setData(json.data)
    setLoading(false)
  }

  useEffect(() => { load() }, [codeId])

  async function toggleActive() {
    if (!data) return
    setActionLoading("toggle")
    await fetch(`/api/admin/referral-codes/${codeId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !data.isActive }),
    })
    await load()
    setActionLoading(null)
  }

  async function generateSnapshot() {
    if (!snapshotMonth) return
    setSnapshotLoading(true)
    setError(null)
    setMsg(null)
    const res = await fetch(`/api/admin/referral-codes/${codeId}/snapshot`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ yearMonth: snapshotMonth }),
    })
    const json = await res.json()
    if (json.success) {
      setMsg("گزارش ماهانه با موفقیت ایجاد/بروزرسانی شد")
      await load()
    } else {
      setError(json.error ?? "خطا")
    }
    setSnapshotLoading(false)
  }

  async function markPaid(earningId: string) {
    setActionLoading(earningId)
    setError(null)
    const res = await fetch(
      `/api/admin/referral-codes/${codeId}/earnings/${earningId}/mark-paid`,
      { method: "POST" }
    )
    const json = await res.json()
    if (json.success) {
      await load()
    } else {
      setError(json.error ?? "خطا در تسویه")
    }
    setActionLoading(null)
  }

  if (loading) return <p className="text-sm text-muted-foreground">در حال بارگذاری...</p>
  if (!data) return <p className="text-sm text-red-600">یافت نشد</p>

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-3">
        <Link href="/admin/referrals" className="text-muted-foreground hover:text-foreground">
          <ArrowRight className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-xl font-bold font-mono tracking-wider">{data.code}</h1>
          {data.label && <p className="text-sm text-muted-foreground">{data.label}</p>}
          {data.office && (
            <p className="text-xs text-muted-foreground">
              دفتر: <Link href={`/admin/offices/${data.office.id}`} className="text-primary hover:underline">{data.office.name}</Link>
            </p>
          )}
        </div>
        <button
          onClick={toggleActive}
          disabled={actionLoading === "toggle"}
          className={`ms-auto rounded-md px-3 py-1.5 text-xs font-medium ${
            data.isActive
              ? "bg-red-100 text-red-700 hover:bg-red-200"
              : "bg-green-100 text-green-700 hover:bg-green-200"
          }`}
        >
          {data.isActive ? "غیرفعال کردن" : "فعال کردن"}
        </button>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: "کل ارجاع‌ها", value: data.referrals.length.toLocaleString("fa-IR") },
          { label: "دفاتر پولی فعال", value: data.activeOfficeCount.toLocaleString("fa-IR") },
          { label: "نرخ کمیسیون ماهانه", value: data.commissionPerOfficePerMonth > 0 ? formatToman(data.commissionPerOfficePerMonth) : "—" },
          { label: "وضعیت", value: data.isActive ? "فعال" : "غیرفعال" },
        ].map((item) => (
          <div key={item.label} className="rounded-lg border border-border p-4">
            <p className="text-xs text-muted-foreground">{item.label}</p>
            <p className="mt-1 text-lg font-bold">{item.value}</p>
          </div>
        ))}
      </div>

      {error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-900/20">
          {error}
        </p>
      )}
      {msg && (
        <p className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-700 dark:bg-green-900/20">
          {msg}
        </p>
      )}

      {/* Referred Offices */}
      <section className="space-y-3">
        <h2 className="font-semibold">دفاتر ارجاع‌شده ({data.referrals.length})</h2>
        {data.referrals.length === 0 ? (
          <p className="text-sm text-muted-foreground">هنوز دفتری با این کد ثبت‌نام نکرده</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-muted/50">
                <tr>
                  <th className="px-4 py-2 text-start font-medium">نام دفتر</th>
                  <th className="px-4 py-2 text-start font-medium">پلن</th>
                  <th className="px-4 py-2 text-start font-medium">وضعیت</th>
                  <th className="px-4 py-2 text-start font-medium">آزمایشی</th>
                  <th className="px-4 py-2 text-start font-medium">تاریخ عضویت</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data.referrals.map((r) => (
                  <tr key={r.office.id} className="hover:bg-muted/30">
                    <td className="px-4 py-2">
                      <Link href={`/admin/offices/${r.office.id}`} className="text-primary hover:underline">
                        {r.office.name}
                      </Link>
                    </td>
                    <td className="px-4 py-2">{r.office.subscription?.plan ?? "—"}</td>
                    <td className="px-4 py-2">{r.office.subscription?.status ?? "—"}</td>
                    <td className="px-4 py-2">{r.office.subscription?.isTrial ? "بله" : "خیر"}</td>
                    <td className="px-4 py-2 text-muted-foreground">
                      {format(new Date(r.office.createdAt), "yyyy/MM/dd")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Monthly Earnings */}
      <section className="space-y-3">
        <h2 className="font-semibold">تاریخچه کمیسیون ماهانه</h2>

        {/* Generate snapshot */}
        <div className="flex items-end gap-3 rounded-lg border border-dashed border-border p-4">
          <div className="space-y-1">
            <label className="text-xs font-medium">ماه</label>
            <select
              value={snapshotMonth}
              onChange={(e) => setSnapshotMonth(e.target.value)}
              className="rounded-md border border-input bg-background px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              {monthOptions.map((m) => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
          </div>
          <button
            onClick={generateSnapshot}
            disabled={snapshotLoading}
            className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {snapshotLoading ? "..." : "تولید گزارش"}
          </button>
        </div>

        {data.monthlyEarnings.length === 0 ? (
          <p className="text-sm text-muted-foreground">هنوز گزارش ماهانه‌ای وجود ندارد</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-muted/50">
                <tr>
                  <th className="px-4 py-2 text-start font-medium">ماه</th>
                  <th className="px-4 py-2 text-start font-medium">دفاتر فعال</th>
                  <th className="px-4 py-2 text-start font-medium">مبلغ کمیسیون</th>
                  <th className="px-4 py-2 text-start font-medium">تسویه</th>
                  <th className="px-4 py-2 text-start font-medium">عملیات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data.monthlyEarnings.map((e) => (
                  <tr key={e.id} className="hover:bg-muted/30">
                    <td className="px-4 py-2 font-mono">{format(new Date(e.yearMonth + "-01"), "yyyy/MM")}</td>
                    <td className="px-4 py-2">{e.activeOfficeCount.toLocaleString("fa-IR")}</td>
                    <td className="px-4 py-2">{e.commissionAmount > 0 ? formatToman(e.commissionAmount) : "—"}</td>
                    <td className="px-4 py-2">
                      {e.isPaid ? (
                        <span className="flex items-center gap-1 text-green-600">
                          <Check className="h-3.5 w-3.5" />
                          {e.paidAt ? format(new Date(e.paidAt), "yyyy/MM/dd") : "تسویه شده"}
                        </span>
                      ) : (
                        <span className="text-amber-600">معوق</span>
                      )}
                    </td>
                    <td className="px-4 py-2">
                      {!e.isPaid && (
                        <button
                          onClick={() => markPaid(e.id)}
                          disabled={actionLoading === e.id}
                          className="rounded-md bg-green-100 px-2 py-1 text-xs font-medium text-green-700 hover:bg-green-200 disabled:opacity-50"
                        >
                          {actionLoading === e.id ? "..." : "تسویه"}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
