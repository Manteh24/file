"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { toastSuccess, toastError } from "@/lib/toast"

type TaskStatus = "TODO" | "IN_PROGRESS" | "DONE" | "CANCELED"

interface AdminTaskActionsProps {
  taskId: string
  currentStatus: TaskStatus
  canEdit: boolean
  canDelete: boolean
}

const STATUS_LABELS: Record<TaskStatus, string> = {
  TODO: "در انتظار",
  IN_PROGRESS: "در حال انجام",
  DONE: "انجام‌شده",
  CANCELED: "لغو شده",
}

export function AdminTaskActions({ taskId, currentStatus, canDelete }: AdminTaskActionsProps) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)

  async function changeStatus(status: TaskStatus) {
    if (status === currentStatus) return
    setBusy(true)
    const res = await fetch(`/api/admin/tasks/${taskId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    })
    const data = (await res.json()) as { success: boolean; error?: string }
    setBusy(false)
    if (!data.success) {
      toastError(data.error ?? "خطا در تغییر وضعیت")
      return
    }
    toastSuccess("وضعیت به‌روزرسانی شد")
    router.refresh()
  }

  async function deleteTask() {
    if (!confirm("این وظیفه حذف شود؟")) return
    setBusy(true)
    const res = await fetch(`/api/admin/tasks/${taskId}`, { method: "DELETE" })
    const data = (await res.json()) as { success: boolean; error?: string }
    setBusy(false)
    if (!data.success) {
      toastError(data.error ?? "خطا در حذف وظیفه")
      return
    }
    toastSuccess("حذف شد")
    router.push("/admin/tasks")
  }

  const statuses: TaskStatus[] = ["TODO", "IN_PROGRESS", "DONE", "CANCELED"]

  return (
    <div className="flex flex-wrap items-center gap-2">
      {statuses.map((s) => (
        <Button
          key={s}
          variant={s === currentStatus ? "default" : "outline"}
          size="sm"
          disabled={busy || s === currentStatus}
          onClick={() => changeStatus(s)}
        >
          {STATUS_LABELS[s]}
        </Button>
      ))}
      {canDelete && (
        <Button variant="destructive" size="sm" disabled={busy} onClick={deleteTask} className="ms-auto">
          حذف
        </Button>
      )}
    </div>
  )
}
