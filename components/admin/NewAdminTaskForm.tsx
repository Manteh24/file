"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { toastSuccess, toastError } from "@/lib/toast"

interface AdminOption {
  id: string
  displayName: string
  role: string
}

interface NewAdminTaskFormProps {
  admins: AdminOption[]
  currentAdminId: string
}

export function NewAdminTaskForm({ admins, currentAdminId }: NewAdminTaskFormProps) {
  const router = useRouter()
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [assigneeId, setAssigneeId] = useState(currentAdminId)
  const [dueAt, setDueAt] = useState("")
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) {
      toastError("عنوان نمی‌تواند خالی باشد")
      return
    }
    setSubmitting(true)

    const res = await fetch("/api/admin/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        assigneeId,
        title: title.trim(),
        description: description.trim() || null,
        dueAt: dueAt ? new Date(dueAt).toISOString() : null,
      }),
    })
    const data = (await res.json()) as { success: boolean; data?: { id: string }; error?: string }
    setSubmitting(false)

    if (!data.success || !data.data) {
      toastError(data.error ?? "خطا در ساخت وظیفه")
      return
    }
    toastSuccess("وظیفه ساخته شد")
    router.push(`/admin/tasks/${data.data.id}`)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-2">
        <label className="text-sm font-medium">عنوان</label>
        <input
          type="text"
          value={title}
          onChange={(e) => { setTitle(e.target.value) }}
          required
          maxLength={200}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">توضیحات (اختیاری)</label>
        <textarea
          value={description}
          onChange={(e) => { setDescription(e.target.value) }}
          rows={4}
          maxLength={4000}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">محول به</label>
        <select
          value={assigneeId}
          onChange={(e) => { setAssigneeId(e.target.value) }}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          {admins.map((a) => (
            <option key={a.id} value={a.id}>
              {a.displayName} {a.id === currentAdminId ? "(خود)" : ""}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">سررسید (اختیاری)</label>
        <input
          type="date"
          value={dueAt}
          onChange={(e) => { setDueAt(e.target.value) }}
          className="rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      <div className="flex items-center gap-3 pt-2">
        <Button type="submit" disabled={submitting}>
          {submitting ? "در حال ساخت..." : "ساخت وظیفه"}
        </Button>
      </div>
    </form>
  )
}
