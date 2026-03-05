"use client"

import { useRouter, useSearchParams, usePathname } from "next/navigation"
import Link from "next/link"
import { format } from "date-fns-jalali"
import type { AdminSubscriptionSummary, Plan, SubStatus, BillingCycle } from "@/types"

const PLAN_LABELS: Record<Plan, string> = { FREE: "رایگان", PRO: "حرفه‌ای", TEAM: "تیم" }
const STATUS_LABELS: Record<SubStatus, string> = {
  ACTIVE: "فعال",
  GRACE: "مهلت",
  LOCKED: "قفل",
  CANCELLED: "لغو",
}
const STATUS_COLORS: Record<SubStatus, string> = {
  ACTIVE: "text-green-600",
  GRACE: "text-amber-600",
  LOCKED: "text-red-600",
  CANCELLED: "text-muted-foreground",
}
const CYCLE_LABELS: Record<BillingCycle, string> = { MONTHLY: "ماهانه", ANNUAL: "سالانه" }

interface SubscriptionsTableProps {
  subscriptions: AdminSubscriptionSummary[]
  total: number
  page: number
  limit: number
}

export function SubscriptionsTable({ subscriptions, total, page, limit }: SubscriptionsTableProps) {
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

  const currentPlan = searchParams.get("plan") ?? ""
  const currentStatus = searchParams.get("status") ?? ""
  const currentIsTrial = searchParams.get("isTrial") ?? ""
  const currentExpiring = searchParams.get("expiringSoon") === "true"
  const currentCycle = searchParams.get("billingCycle") ?? ""

  const totalPages = Math.ceil(total / limit)

  function getEndDate(sub: AdminSubscriptionSummary): string {
    if (sub.plan === "FREE") return "بدون انقضا"
    const d = sub.isTrial ? sub.trialEndsAt : sub.currentPeriodEnd
    if (!d) return "—"
    return format(new Date(d), "yyyy/MM/dd")
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        {/* Plan pills */}
        <div className="flex gap-1">
          {(["", "FREE", "PRO", "TEAM"] as const).map((p) => (
            <button
              key={p}
              onClick={() => updateParam("plan", p || null)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                currentPlan === p
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {p === "" ? "همه پلن‌ها" : PLAN_LABELS[p]}
            </button>
          ))}
        </div>

        {/* Status pills */}
        <div className="flex gap-1">
          {(["", "ACTIVE", "GRACE", "LOCKED", "CANCELLED"] as const).map((s) => (
            <button
              key={s}
              onClick={() => updateParam("status", s || null)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                currentStatus === s
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {s === "" ? "همه وضعیت‌ها" : STATUS_LABELS[s]}
            </button>
          ))}
        </div>

        {/* Billing cycle */}
        <select
          value={currentCycle}
          onChange={(e) => updateParam("billingCycle", e.target.value || null)}
          className="rounded-lg border border-input bg-background px-3 py-1 text-xs focus:outline-none"
        >
          <option value="">همه چرخه‌ها</option>
          <option value="MONTHLY">ماهانه</option>
          <option value="ANNUAL">سالانه</option>
        </select>

        {/* Checkboxes */}
        <label className="flex items-center gap-1.5 text-xs cursor-pointer">
          <input
            type="checkbox"
            checked={currentIsTrial === "true"}
            onChange={(e) => updateParam("isTrial", e.target.checked ? "true" : null)}
            className="rounded"
          />
          در دوره آزمایشی
        </label>
        <label className="flex items-center gap-1.5 text-xs cursor-pointer">
          <input
            type="checkbox"
            checked={currentExpiring}
            onChange={(e) => updateParam("expiringSoon", e.target.checked ? "true" : null)}
            className="rounded"
          />
          انقضا در ۷ روز آینده
        </label>
      </div>

      {/* Count */}
      <p className="text-xs text-muted-foreground">
        {total.toLocaleString("fa-IR")} اشتراک
      </p>

      {/* Table */}
      {subscriptions.length === 0 ? (
        <p className="text-sm text-muted-foreground py-8 text-center">هیچ اشتراکی یافت نشد</p>
      ) : (
        <div className="rounded-xl border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/40 border-b border-border">
                <th className="px-4 py-2.5 text-start font-medium text-muted-foreground">دفتر</th>
                <th className="px-4 py-2.5 text-start font-medium text-muted-foreground">پلن</th>
                <th className="px-4 py-2.5 text-start font-medium text-muted-foreground">وضعیت</th>
                <th className="px-4 py-2.5 text-start font-medium text-muted-foreground">آزمایشی</th>
                <th className="px-4 py-2.5 text-start font-medium text-muted-foreground">چرخه</th>
                <th className="px-4 py-2.5 text-start font-medium text-muted-foreground">تاریخ پایان</th>
                <th className="px-4 py-2.5 text-start font-medium text-muted-foreground"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {subscriptions.map((sub) => (
                <tr key={sub.id} className="hover:bg-muted/20">
                  <td className="px-4 py-2.5 font-medium">{sub.officeName}</td>
                  <td className="px-4 py-2.5">{PLAN_LABELS[sub.plan]}</td>
                  <td className={`px-4 py-2.5 font-medium ${STATUS_COLORS[sub.status]}`}>
                    {STATUS_LABELS[sub.status]}
                  </td>
                  <td className="px-4 py-2.5 text-muted-foreground">
                    {sub.isTrial ? "بله" : "خیر"}
                  </td>
                  <td className="px-4 py-2.5 text-muted-foreground">
                    {sub.plan === "FREE" ? "—" : CYCLE_LABELS[sub.billingCycle]}
                  </td>
                  <td className="px-4 py-2.5 tabular-nums text-muted-foreground">
                    {getEndDate(sub)}
                  </td>
                  <td className="px-4 py-2.5">
                    <Link
                      href={`/admin/offices/${sub.officeId}`}
                      className="text-xs text-primary hover:underline"
                    >
                      جزئیات
                    </Link>
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
