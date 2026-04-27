"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toastSuccess, toastError } from "@/lib/toast"

interface ArchiveRestoreButtonsProps {
  officeId: string
  officeName: string
  isArchived: boolean
}

export function ArchiveRestoreButtons({ officeId, officeName, isArchived }: ArchiveRestoreButtonsProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  async function handleAction() {
    const action = isArchived ? "restore" : "archive"
    if (!isArchived) {
      const confirmed = window.confirm(
        `آیا مطمئن هستید که می‌خواهید دفتر «${officeName}» را بایگانی کنید؟\n\nدفتر از لیست فعال حذف می‌شود اما داده‌ها حفظ می‌مانند.`
      )
      if (!confirmed) return
    }

    setLoading(true)
    setError(null)

    const res = await fetch(`/api/admin/offices/${officeId}/${action}`, { method: "POST" })
    const json = await res.json() as { success: boolean; error?: string }

    if (json.success) {
      toastSuccess(isArchived ? "دفتر بازیابی شد" : "دفتر بایگانی شد")
      router.refresh()
    } else {
      const errorMsg = json.error ?? "خطا"
      setError(errorMsg)
      toastError(errorMsg)
    }
    setLoading(false)
  }

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={handleAction}
        disabled={loading}
        className={
          isArchived
            ? "rounded-lg border border-green-300 bg-green-50 px-4 py-2 text-sm font-medium text-green-700 hover:bg-green-100 disabled:opacity-50 transition-colors"
            : "rounded-lg border border-red-300 bg-red-50 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-100 disabled:opacity-50 transition-colors"
        }
      >
        {loading ? "در حال اجرا..." : isArchived ? "بازیابی دفتر" : "بایگانی دفتر"}
      </button>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  )
}
