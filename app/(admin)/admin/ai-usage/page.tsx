"use client"

import { useEffect, useState } from "react"
import { Zap, AlertTriangle } from "lucide-react"
import { formatToman } from "@/lib/utils"

interface AiEntry {
  officeId: string
  officeName: string
  plan: string
  subStatus: string
  count: number
  cost: number
  isAnomaly: boolean
  isAtFreeLimit: boolean
}

interface AiUsageData {
  shamsiMonth: number
  entries: AiEntry[]
  freeAtLimit: AiEntry[]
  anomalies: AiEntry[]
  totalCalls: number
  totalCost: number
  avgCalls: number
}

// Build last 4 Shamsi months from current
function buildMonthOptions(): { label: string; value: string }[] {
  // Use JS to build 4 month strings in YYYYMM-like format for display
  // We'll just show current & last 3 as labels; API handles conversion
  const now = new Date()
  const options: { label: string; value: string }[] = []
  for (let i = 0; i < 4; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    // Format as YYYYMM (Gregorian — close enough for selector label)
    const yyyymm = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}`
    options.push({
      label: `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}`,
      value: yyyymm,
    })
  }
  return options
}

const PLAN_LABELS: Record<string, string> = { FREE: "رایگان", PRO: "پرو", TEAM: "تیم" }

export default function AiUsagePage() {
  const monthOptions = buildMonthOptions()
  const [selectedMonth, setSelectedMonth] = useState(monthOptions[0].value)
  const [data, setData] = useState<AiUsageData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    fetch(`/api/admin/ai-usage?month=${selectedMonth}`)
      .then((r) => r.json())
      .then((j) => { if (j.success) setData(j.data) })
      .finally(() => setLoading(false))
  }, [selectedMonth])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Zap className="h-5 w-5 text-muted-foreground" />
          <h1 className="text-xl font-bold">مصرف هوش مصنوعی</h1>
        </div>
        <select
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(e.target.value)}
          className="rounded-md border border-input bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          {monthOptions.map((m) => (
            <option key={m.value} value={m.value}>{m.label}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">در حال بارگذاری...</p>
      ) : !data ? (
        <p className="text-sm text-red-600">خطا در بارگذاری داده</p>
      ) : (
        <>
          {/* Summary bar */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {[
              { label: "کل درخواست‌ها", value: data.totalCalls.toLocaleString("fa-IR") },
              { label: "هزینه کل", value: formatToman(data.totalCost) },
              { label: "میانگین هر دفتر", value: data.avgCalls.toLocaleString("fa-IR") },
              { label: "دفاتر رایگان به سقف رسیده", value: data.freeAtLimit.length.toLocaleString("fa-IR"), alert: data.freeAtLimit.length > 0 },
            ].map((item) => (
              <div key={item.label} className={`rounded-lg border p-4 ${item.alert ? "border-amber-300 bg-amber-50 dark:border-amber-700 dark:bg-amber-900/20" : "border-border"}`}>
                <p className="text-xs text-muted-foreground">{item.label}</p>
                <p className={`mt-1 text-lg font-bold ${item.alert ? "text-amber-700 dark:text-amber-400" : ""}`}>{item.value}</p>
              </div>
            ))}
          </div>

          {/* Anomalies */}
          {data.anomalies.length > 0 && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
              <div className="flex items-center gap-2 text-red-700 dark:text-red-400 mb-2">
                <AlertTriangle className="h-4 w-4" />
                <span className="font-semibold text-sm">مصرف غیرعادی ({data.anomalies.length} دفتر)</span>
              </div>
              <ul className="text-sm space-y-0.5">
                {data.anomalies.map((e) => (
                  <li key={e.officeId} className="text-red-700 dark:text-red-300">
                    {e.officeName} — {e.count.toLocaleString("fa-IR")} درخواست
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Main table */}
          {data.entries.length === 0 ? (
            <div className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">
              هیچ داده‌ای برای این ماه وجود ندارد
            </div>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full text-sm">
                <thead className="border-b border-border bg-muted/50">
                  <tr>
                    <th className="px-4 py-3 text-start font-medium">دفتر</th>
                    <th className="px-4 py-3 text-start font-medium">پلن</th>
                    <th className="px-4 py-3 text-start font-medium">درخواست‌ها</th>
                    <th className="px-4 py-3 text-start font-medium">هزینه</th>
                    <th className="px-4 py-3 text-start font-medium">نشانگر</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {data.entries.map((e) => (
                    <tr key={e.officeId} className={`transition-colors ${e.isAnomaly ? "bg-red-50/50 dark:bg-red-900/10" : "hover:bg-muted/30"}`}>
                      <td className="px-4 py-2.5 font-medium">{e.officeName}</td>
                      <td className="px-4 py-2.5 text-muted-foreground">{PLAN_LABELS[e.plan] ?? e.plan}</td>
                      <td className="px-4 py-2.5">{e.count.toLocaleString("fa-IR")}</td>
                      <td className="px-4 py-2.5">{formatToman(e.cost)}</td>
                      <td className="px-4 py-2.5">
                        {e.isAtFreeLimit && (
                          <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                            به سقف رسیده
                          </span>
                        )}
                        {e.isAnomaly && !e.isAtFreeLimit && (
                          <span className="inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-xs text-red-700 dark:bg-red-900/30 dark:text-red-400">
                            غیرعادی
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  )
}
