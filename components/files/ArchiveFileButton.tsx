"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Archive } from "lucide-react"
import { Button } from "@/components/ui/button"

interface ArchiveFileButtonProps {
  fileId: string
}

export function ArchiveFileButton({ fileId }: ArchiveFileButtonProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleArchive() {
    if (!confirm("آیا از بایگانی این فایل مطمئن هستید؟ تمام لینک‌های اشتراک‌گذاری غیرفعال می‌شوند.")) {
      return
    }

    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/files/${fileId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "ARCHIVED" }),
      })

      const result = (await response.json()) as { success: boolean; error?: string }

      if (!result.success) {
        setError(result.error ?? "خطا در بایگانی فایل")
        return
      }

      router.refresh()
    } catch {
      setError("خطا در ارتباط با سرور")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button variant="outline" onClick={handleArchive} disabled={loading}>
        <Archive className="h-4 w-4 rtl:ml-1.5 ltr:mr-1.5" />
        {loading ? "در حال بایگانی..." : "بایگانی"}
      </Button>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}
