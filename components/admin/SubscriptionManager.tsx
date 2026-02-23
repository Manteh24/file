"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import type { Plan, SubStatus } from "@/types"

const PLAN_LABELS: Record<Plan, string> = {
  TRIAL: "آزمایشی",
  SMALL: "کوچک",
  LARGE: "بزرگ",
}

const STATUS_LABELS: Record<SubStatus, string> = {
  ACTIVE: "فعال",
  GRACE: "مهلت",
  LOCKED: "قفل",
  CANCELLED: "لغو",
}

interface SubscriptionManagerProps {
  officeId: string
  currentPlan: Plan
  currentStatus: SubStatus
}

export function SubscriptionManager({
  officeId,
  currentPlan,
  currentStatus,
}: SubscriptionManagerProps) {
  const [plan, setPlan] = useState<Plan>(currentPlan)
  const [status, setStatus] = useState<SubStatus>(currentStatus)
  const [extendDays, setExtendDays] = useState("")
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState("")

  async function handleSave() {
    setLoading(true)
    setError("")
    setSaved(false)
    try {
      const body: Record<string, unknown> = {}
      if (plan !== currentPlan) body.plan = plan
      if (status !== currentStatus) body.status = status
      const days = parseInt(extendDays, 10)
      if (!isNaN(days) && days > 0) body.extendDays = days

      if (Object.keys(body).length === 0) {
        setError("تغییری انتخاب نشده است")
        return
      }

      const res = await fetch(`/api/admin/offices/${officeId}/subscription`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        const json = await res.json()
        setError(json.error ?? "خطا در ذخیره‌سازی")
        return
      }

      setSaved(true)
      setExtendDays("")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-4">
      <h3 className="text-sm font-semibold">مدیریت اشتراک</h3>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Plan selector */}
        <div>
          <label className="block text-xs text-muted-foreground mb-1">پلن</label>
          <select
            value={plan}
            onChange={(e) => { setPlan(e.target.value as Plan); setSaved(false) }}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
          >
            {(["TRIAL", "SMALL", "LARGE"] as Plan[]).map((p) => (
              <option key={p} value={p}>{PLAN_LABELS[p]}</option>
            ))}
          </select>
        </div>

        {/* Status selector */}
        <div>
          <label className="block text-xs text-muted-foreground mb-1">وضعیت</label>
          <select
            value={status}
            onChange={(e) => { setStatus(e.target.value as SubStatus); setSaved(false) }}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
          >
            {(["ACTIVE", "GRACE", "LOCKED", "CANCELLED"] as SubStatus[]).map((s) => (
              <option key={s} value={s}>{STATUS_LABELS[s]}</option>
            ))}
          </select>
        </div>

        {/* Extend days */}
        <div>
          <label className="block text-xs text-muted-foreground mb-1">تمدید (روز)</label>
          <input
            type="number"
            min={1}
            max={365}
            value={extendDays}
            onChange={(e) => { setExtendDays(e.target.value); setSaved(false) }}
            placeholder="مثلاً ۳۰"
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Button onClick={handleSave} disabled={loading} size="sm">
          {loading ? "در حال ذخیره..." : "ذخیره تغییرات"}
        </Button>
        {saved && <span className="text-xs text-green-600">✓ ذخیره شد</span>}
        {error && <span className="text-xs text-red-600">{error}</span>}
      </div>
    </div>
  )
}
