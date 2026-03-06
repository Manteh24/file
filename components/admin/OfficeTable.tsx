"use client"

import { useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { format } from "date-fns-jalali"
import { Search, Archive } from "lucide-react"
import { cn } from "@/lib/utils"
import type { AdminOfficeSummary, Plan, SubStatus } from "@/types"

const PLAN_LABELS: Record<Plan, string> = {
  FREE: "رایگان",
  PRO: "حرفه‌ای",
  TEAM: "تیم",
}

const STATUS_LABELS: Record<SubStatus, string> = {
  ACTIVE: "فعال",
  GRACE: "مهلت",
  LOCKED: "قفل",
  CANCELLED: "لغو",
}

const STATUS_CLASSES: Record<SubStatus, string> = {
  ACTIVE: "bg-green-100 text-green-700",
  GRACE: "bg-amber-100 text-amber-700",
  LOCKED: "bg-red-100 text-red-700",
  CANCELLED: "bg-muted text-muted-foreground",
}

interface OfficeTableProps {
  offices: AdminOfficeSummary[]
  showArchived?: boolean
}

export function OfficeTable({ offices, showArchived = false }: OfficeTableProps) {
  const [search, setSearch] = useState("")
  const router = useRouter()
  const searchParams = useSearchParams()

  const filtered = offices.filter((o) =>
    o.name.toLowerCase().includes(search.toLowerCase()) ||
    (o.city ?? "").toLowerCase().includes(search.toLowerCase())
  )

  function toggleArchived() {
    const params = new URLSearchParams(searchParams.toString())
    if (showArchived) {
      params.delete("includeArchived")
    } else {
      params.set("includeArchived", "true")
    }
    router.push(`/admin/offices?${params.toString()}`)
  }

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute end-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="جستجوی نام دفتر یا شهر..."
            className="w-full rounded-lg border border-border bg-background px-4 py-2 pe-9 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <button
          onClick={toggleArchived}
          className={cn(
            "flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm transition-colors",
            showArchived
              ? "border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100"
              : "border-border bg-background text-muted-foreground hover:bg-muted"
          )}
        >
          <Archive className="h-3.5 w-3.5" />
          {showArchived ? "پنهان کردن بایگانی‌ها" : "نمایش بایگانی‌ها"}
        </button>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <p className="py-12 text-center text-sm text-muted-foreground">دفتری یافت نشد</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="px-4 py-3 text-start font-medium text-muted-foreground">نام دفتر</th>
                <th className="px-4 py-3 text-start font-medium text-muted-foreground">شهر</th>
                <th className="px-4 py-3 text-start font-medium text-muted-foreground">پلن</th>
                <th className="px-4 py-3 text-start font-medium text-muted-foreground">وضعیت</th>
                <th className="px-4 py-3 text-start font-medium text-muted-foreground">کاربران</th>
                <th className="px-4 py-3 text-start font-medium text-muted-foreground">تاریخ ثبت</th>
                <th className="px-4 py-3 text-start font-medium text-muted-foreground"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((office) => (
                <tr
                  key={office.id}
                  className={cn(
                    "hover:bg-muted/20 transition-colors",
                    office.deletedAt && "opacity-60"
                  )}
                >
                  <td className="px-4 py-3 font-medium">
                    <span>{office.name}</span>
                    {office.deletedAt && (
                      <span className="ms-2 text-[10px] font-medium text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded-full">
                        بایگانی
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{office.city ?? "—"}</td>
                  <td className="px-4 py-3">
                    {office.subscription ? (
                      <span className="text-xs font-medium text-muted-foreground">
                        {PLAN_LABELS[office.subscription.plan]}
                      </span>
                    ) : "—"}
                  </td>
                  <td className="px-4 py-3">
                    {office.subscription ? (
                      <span className={cn(
                        "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium",
                        STATUS_CLASSES[office.subscription.status]
                      )}>
                        {STATUS_LABELS[office.subscription.status]}
                      </span>
                    ) : "—"}
                  </td>
                  <td className="px-4 py-3 tabular-nums">{office._count.users.toLocaleString("fa-IR")}</td>
                  <td className="px-4 py-3 text-muted-foreground tabular-nums">
                    {format(new Date(office.createdAt), "yyyy/MM/dd")}
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/offices/${office.id}`}
                      className="text-xs font-medium text-primary hover:underline"
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
    </div>
  )
}
