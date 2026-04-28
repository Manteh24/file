"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
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

interface ArchiveRestoreButtonsProps {
  officeId: string
  officeName: string
  isArchived: boolean
}

export function ArchiveRestoreButtons({ officeId, officeName, isArchived }: ArchiveRestoreButtonsProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)

  async function runAction() {
    const action = isArchived ? "restore" : "archive"
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/offices/${officeId}/${action}`, { method: "POST" })
      const json = (await res.json()) as { success: boolean; error?: string }

      if (json.success) {
        toastSuccess(isArchived ? "دفتر بازیابی شد" : "دفتر بایگانی شد")
        setConfirmOpen(false)
        router.refresh()
      } else {
        toastError(json.error ?? "خطا")
      }
    } catch {
      toastError("خطا در ارتباط با سرور")
    } finally {
      setLoading(false)
    }
  }

  function handleClick() {
    // Restore is reversible — fire immediately. Archive needs confirmation.
    if (isArchived) {
      runAction()
    } else {
      setConfirmOpen(true)
    }
  }

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={handleClick}
        disabled={loading}
        className={
          isArchived
            ? "rounded-lg border border-green-300 bg-green-50 px-4 py-2 text-sm font-medium text-green-700 hover:bg-green-100 disabled:opacity-50 transition-colors"
            : "rounded-lg border border-red-300 bg-red-50 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-100 disabled:opacity-50 transition-colors"
        }
      >
        {loading ? "در حال اجرا..." : isArchived ? "بازیابی دفتر" : "بایگانی دفتر"}
      </button>

      <AlertDialog open={confirmOpen} onOpenChange={(v) => !loading && setConfirmOpen(v)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>بایگانی دفتر؟</AlertDialogTitle>
            <AlertDialogDescription>
              آیا مطمئن هستید که می‌خواهید دفتر «{officeName}» را بایگانی کنید؟ دفتر از لیست فعال حذف می‌شود اما داده‌ها حفظ می‌مانند.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>انصراف</AlertDialogCancel>
            <AlertDialogAction onClick={runAction} disabled={loading}>
              {loading ? "در حال اجرا..." : "بایگانی"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
