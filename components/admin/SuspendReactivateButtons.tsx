"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import type { SubStatus } from "@/types"
import { toastSuccess, toastError } from "@/lib/toast"

interface SuspendReactivateButtonsProps {
  officeId: string
  currentStatus: SubStatus
  officeName: string
}

export function SuspendReactivateButtons({
  officeId,
  currentStatus,
  officeName,
}: SuspendReactivateButtonsProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const canSuspend = currentStatus === "ACTIVE" || currentStatus === "GRACE"
  const canReactivate = currentStatus === "LOCKED" || currentStatus === "CANCELLED"

  async function handleAction(action: "suspend" | "reactivate") {
    const confirmMsg =
      action === "suspend"
        ? `آیا مطمئن هستید که می‌خواهید دفتر «${officeName}» را تعلیق کنید؟`
        : `آیا مطمئن هستید که می‌خواهید دفتر «${officeName}» را فعال‌سازی مجدد کنید؟`

    if (!window.confirm(confirmMsg)) return

    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/offices/${officeId}/${action}`, { method: "POST" })
      const json = await res.json() as { success: boolean; error?: string }
      if (!json.success) throw new Error(json.error ?? "عملیات ناموفق بود")
      toastSuccess(action === "suspend" ? "اشتراک معلق شد" : "اشتراک فعال شد")
      router.refresh()
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "خطای ناشناخته"
      setError(errorMsg)
      toastError(errorMsg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex items-center gap-3">
      {canSuspend && (
        <button
          onClick={() => handleAction("suspend")}
          disabled={loading}
          className="rounded-lg border border-amber-400 bg-amber-50 px-4 py-2 text-sm font-medium text-amber-800 hover:bg-amber-100 disabled:opacity-50 transition-colors"
        >
          {loading ? "در حال پردازش..." : "تعلیق دفتر"}
        </button>
      )}
      {canReactivate && (
        <button
          onClick={() => handleAction("reactivate")}
          disabled={loading}
          className="rounded-lg border border-green-400 bg-green-50 px-4 py-2 text-sm font-medium text-green-800 hover:bg-green-100 disabled:opacity-50 transition-colors"
        >
          {loading ? "در حال پردازش..." : "فعال‌سازی مجدد"}
        </button>
      )}
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  )
}
