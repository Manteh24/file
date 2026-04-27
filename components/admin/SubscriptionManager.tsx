"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import type { Plan, SubStatus } from "@/types"
import { toastSuccess, toastError } from "@/lib/toast"

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

interface SubscriptionManagerProps {
  officeId: string
  currentPlan: Plan
  currentStatus: SubStatus
  currentIsTrial: boolean
}

export function SubscriptionManager({
  officeId,
  currentPlan,
  currentStatus,
  currentIsTrial,
}: SubscriptionManagerProps) {
  const router = useRouter()
  const [plan, setPlan] = useState<Plan>(currentPlan)
  const [status, setStatus] = useState<SubStatus>(currentStatus)
  const [isTrial, setIsTrial] = useState<boolean>(currentIsTrial)
  const [extendDays, setExtendDays] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  async function handleSave() {
    setLoading(true)
    setError("")
    try {
      const body: Record<string, unknown> = {}
      if (plan !== currentPlan) body.plan = plan
      if (status !== currentStatus) body.status = status
      if (isTrial !== currentIsTrial) body.isTrial = isTrial
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
        const errorMsg = json.error ?? "خطا در ذخیره‌سازی"
        setError(errorMsg)
        toastError(errorMsg)
        return
      }

      toastSuccess("اشتراک به‌روزرسانی شد")
      setExtendDays("")
      router.refresh()
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
            onChange={(e) => setPlan(e.target.value as Plan)}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
          >
            {(["FREE", "PRO", "TEAM"] as Plan[]).map((p) => (
              <option key={p} value={p}>{PLAN_LABELS[p]}</option>
            ))}
          </select>
        </div>

        {/* Status selector */}
        <div>
          <label className="block text-xs text-muted-foreground mb-1">وضعیت</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as SubStatus)}
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
            onChange={(e) => setExtendDays(e.target.value)}
            placeholder="مثلاً ۳۰"
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
      </div>

      {/* isTrial toggle */}
      <label className="flex items-center gap-2 text-sm cursor-pointer">
        <input
          type="checkbox"
          checked={isTrial}
          onChange={(e) => setIsTrial(e.target.checked)}
          className="rounded border-border"
        />
        دوره آزمایشی
      </label>

      <div className="flex items-center gap-3">
        <Button onClick={handleSave} disabled={loading} size="sm">
          {loading ? "در حال ذخیره..." : "ذخیره تغییرات"}
        </Button>
        {error && <span className="text-xs text-red-600">{error}</span>}
      </div>
    </div>
  )
}
