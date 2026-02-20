"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
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

interface DeactivateAgentButtonProps {
  agentId: string
  agentName: string
  isActive: boolean
}

export function DeactivateAgentButton({ agentId, agentName, isActive }: DeactivateAgentButtonProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleToggle() {
    setLoading(true)
    setError(null)

    try {
      // Deactivate uses DELETE (soft delete). Reactivate uses PATCH with isActive: true.
      const response = isActive
        ? await fetch(`/api/agents/${agentId}`, { method: "DELETE" })
        : await fetch(`/api/agents/${agentId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ isActive: true }),
          })

      const data: { success: boolean; error?: string } = await response.json()

      if (!data.success) {
        setError(data.error ?? "خطایی رخ داد")
        return
      }

      router.refresh()
    } catch {
      setError("خطا در ارتباط با سرور")
    } finally {
      setLoading(false)
    }
  }

  if (!isActive) {
    return (
      <div className="space-y-1">
        <Button
          variant="outline"
          onClick={handleToggle}
          disabled={loading}
        >
          {loading ? "در حال فعال‌سازی..." : "فعال‌سازی مجدد"}
        </Button>
        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>
    )
  }

  return (
    <div className="space-y-1">
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant="destructive" disabled={loading}>
            {loading ? "در حال غیرفعال‌سازی..." : "غیرفعال‌سازی مشاور"}
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>غیرفعال‌سازی مشاور</AlertDialogTitle>
            <AlertDialogDescription>
              آیا مطمئن هستید که می‌خواهید <strong>{agentName}</strong> را غیرفعال کنید؟
              این مشاور دیگر قادر به ورود به سیستم نخواهد بود.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>انصراف</AlertDialogCancel>
            <AlertDialogAction onClick={handleToggle}>
              بله، غیرفعال کنید
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  )
}
