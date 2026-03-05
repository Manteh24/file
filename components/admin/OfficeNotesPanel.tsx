"use client"

import { useState, useEffect, useCallback } from "react"
import { format } from "date-fns-jalali"
import type { OfficeNoteItem } from "@/types"

interface OfficeNotesPanelProps {
  officeId: string
}

export function OfficeNotesPanel({ officeId }: OfficeNotesPanelProps) {
  const [notes, setNotes] = useState<OfficeNoteItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [content, setContent] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const loadNotes = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/offices/${officeId}/notes`)
      const json = await res.json() as { success: boolean; data?: OfficeNoteItem[]; error?: string }
      if (!json.success) throw new Error(json.error ?? "خطا در بارگذاری یادداشت‌ها")
      setNotes(json.data ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : "خطای ناشناخته")
    } finally {
      setLoading(false)
    }
  }, [officeId])

  useEffect(() => { loadNotes() }, [loadNotes])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!content.trim()) return
    setSubmitting(true)
    setSubmitError(null)
    try {
      const res = await fetch(`/api/admin/offices/${officeId}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: content.trim() }),
      })
      const json = await res.json() as { success: boolean; data?: OfficeNoteItem; error?: string }
      if (!json.success) throw new Error(json.error ?? "خطا در ثبت یادداشت")
      if (json.data) setNotes((prev) => [json.data!, ...prev])
      setContent("")
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "خطای ناشناخته")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-4">
      <h3 className="font-semibold text-sm">یادداشت‌های داخلی</h3>

      {/* New note form */}
      <form onSubmit={handleSubmit} className="space-y-2">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="یادداشت جدید برای این دفتر..."
          rows={3}
          maxLength={2000}
          className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
        />
        {submitError && <p className="text-xs text-red-600">{submitError}</p>}
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">{content.length}/۲۰۰۰</span>
          <button
            type="submit"
            disabled={submitting || !content.trim()}
            className="rounded-lg bg-primary px-4 py-1.5 text-xs font-medium text-primary-foreground disabled:opacity-50"
          >
            {submitting ? "در حال ثبت..." : "ثبت یادداشت"}
          </button>
        </div>
      </form>

      {/* Notes list */}
      {loading ? (
        <p className="text-sm text-muted-foreground">در حال بارگذاری...</p>
      ) : error ? (
        <p className="text-sm text-red-600">{error}</p>
      ) : notes.length === 0 ? (
        <p className="text-sm text-muted-foreground">هیچ یادداشتی ثبت نشده</p>
      ) : (
        <ul className="space-y-3 max-h-72 overflow-y-auto">
          {notes.map((note) => (
            <li key={note.id} className="rounded-lg bg-muted/40 px-3 py-2.5 text-sm">
              <p className="leading-relaxed">{note.content}</p>
              <p className="mt-1.5 text-xs text-muted-foreground">
                {note.adminName} — {format(new Date(note.createdAt), "yyyy/MM/dd HH:mm")}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
