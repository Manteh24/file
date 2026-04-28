"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Archive } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { toastSuccess, toastError } from "@/lib/toast"

interface ArchiveFileButtonProps {
  fileId: string
}

export function ArchiveFileButton({ fileId }: ArchiveFileButtonProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)

  async function handleArchive() {
    setLoading(true)

    try {
      const response = await fetch(`/api/files/${fileId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "ARCHIVED" }),
      })

      const result = (await response.json()) as { success: boolean; error?: string }

      if (!result.success) {
        toastError(result.error ?? "خطا در بایگانی فایل")
        return
      }

      toastSuccess("فایل بایگانی شد")
      setOpen(false)
      router.refresh()
    } catch {
      toastError("خطا در ارتباط با سرور")
    } finally {
      setLoading(false)
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button variant="outline" disabled={loading}>
          <Archive className="h-4 w-4 rtl:ml-1.5 ltr:mr-1.5" />
          {loading ? "در حال بایگانی..." : "بایگانی"}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>بایگانی فایل؟</AlertDialogTitle>
          <AlertDialogDescription>
            آیا از بایگانی این فایل مطمئن هستید؟ تمام لینک‌های اشتراک‌گذاری غیرفعال می‌شوند.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>انصراف</AlertDialogCancel>
          <AlertDialogAction onClick={handleArchive} disabled={loading}>
            {loading ? "در حال بایگانی..." : "بایگانی"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
