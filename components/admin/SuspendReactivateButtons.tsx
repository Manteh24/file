"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import type { SubStatus } from "@/types"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
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
  const [pending, setPending] = useState<"suspend" | "reactivate" | null>(null)

  const canSuspend = currentStatus === "ACTIVE" || currentStatus === "GRACE"
  const canReactivate = currentStatus === "LOCKED" || currentStatus === "CANCELLED"

  async function confirmAction() {
    if (!pending) return
    const action = pending
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/offices/${officeId}/${action}`, { method: "POST" })
      const json = (await res.json()) as { success: boolean; error?: string }
      if (!json.success) throw new Error(json.error ?? "عملیات ناموفق بود")
      toastSuccess(action === "suspend" ? "اشتراک معلق شد" : "اشتراک فعال شد")
      setPending(null)
      router.refresh()
    } catch (err) {
      toastError(err instanceof Error ? err.message : "خطای ناشناخته")
    } finally {
      setLoading(false)
    }
  }

  const dialogCopy = pending === "suspend"
    ? {
        title: "تعلیق دفتر؟",
        description: `آیا مطمئن هستید که می‌خواهید دفتر «${officeName}» را تعلیق کنید؟`,
        actionLabel: "تعلیق",
      }
    : {
        title: "فعال‌سازی مجدد دفتر؟",
        description: `آیا مطمئن هستید که می‌خواهید دفتر «${officeName}» را فعال‌سازی مجدد کنید؟`,
        actionLabel: "فعال‌سازی",
      }

  return (
    <div className="flex items-center gap-3">
      {canSuspend && (
        <button
          onClick={() => setPending("suspend")}
          disabled={loading}
          className="rounded-lg border border-amber-400 bg-amber-50 px-4 py-2 text-sm font-medium text-amber-800 hover:bg-amber-100 disabled:opacity-50 transition-colors"
        >
          {loading && pending === "suspend" ? "در حال پردازش..." : "تعلیق دفتر"}
        </button>
      )}
      {canReactivate && (
        <button
          onClick={() => setPending("reactivate")}
          disabled={loading}
          className="rounded-lg border border-green-400 bg-green-50 px-4 py-2 text-sm font-medium text-green-800 hover:bg-green-100 disabled:opacity-50 transition-colors"
        >
          {loading && pending === "reactivate" ? "در حال پردازش..." : "فعال‌سازی مجدد"}
        </button>
      )}

      <AlertDialog open={pending !== null} onOpenChange={(v) => !v && !loading && setPending(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{dialogCopy.title}</AlertDialogTitle>
            <AlertDialogDescription>{dialogCopy.description}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>انصراف</AlertDialogCancel>
            <AlertDialogAction onClick={confirmAction} disabled={loading}>
              {loading ? "در حال پردازش..." : dialogCopy.actionLabel}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
