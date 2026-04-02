"use client"
import { usePlanStatus } from "@/hooks/usePlanStatus"
import { Skeleton } from "@/components/ui/skeleton"

function ProgressBar({ current, max }: { current: number; max: number }) {
  const ratio = max > 0 ? current / max : 0
  const pct = Math.min(ratio * 100, 100)
  const fillClass =
    ratio >= 1 ? "bg-red-500" : ratio >= 0.7 ? "bg-amber-500" : "bg-[--color-primary]"

  return (
    <div className="w-full rounded-full bg-muted h-2 overflow-hidden" dir="ltr">
      <div className={`h-full rounded-full transition-all ${fillClass}`} style={{ width: `${pct}%` }} />
    </div>
  )
}

export function PlanUsageSummary() {
  const { data, isLoading } = usePlanStatus()

  if (isLoading) {
    return (
      <div className="space-y-3 rounded-xl border p-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="space-y-1">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-2 w-full" />
          </div>
        ))}
      </div>
    )
  }

  if (!data || data.plan !== "FREE") return null

  const rows = [
    { label: "فایل‌های فعال", current: data.usage.activeFiles, max: data.usage.activeFilesMax },
    { label: "مشاوران", current: data.usage.users, max: data.usage.usersMax },
    { label: "AI این ماه", current: data.usage.aiThisMonth, max: data.usage.aiMax },
    { label: "SMS این ماه", current: data.usage.smsThisMonth, max: data.usage.smsMax },
  ].filter((r) => r.max !== -1)

  if (rows.length === 0) return null

  return (
    <div className="space-y-3 rounded-xl border p-4">
      <p className="text-sm font-medium text-muted-foreground">محدودیت‌های پلن رایگان</p>
      {rows.map((row) => (
        <div key={row.label} className="space-y-1">
          <div className="flex justify-between text-sm">
            <span>{row.label}</span>
            <span className="text-muted-foreground">
              {row.current.toLocaleString("fa-IR")} از {row.max.toLocaleString("fa-IR")}
            </span>
          </div>
          <ProgressBar current={row.current} max={row.max} />
        </div>
      ))}
    </div>
  )
}
