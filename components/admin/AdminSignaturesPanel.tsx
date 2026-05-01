"use client"

import { useState, useEffect, useCallback } from "react"
import { toastSuccess, toastError } from "@/lib/toast"

interface SignatureItem {
  id: string
  label: string
  body: string
  isDefault: boolean
}

const MAX_LABEL = 50
const MAX_BODY = 2000

export function AdminSignaturesPanel() {
  const [signatures, setSignatures] = useState<SignatureItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [showForm, setShowForm] = useState(false)
  const [newLabel, setNewLabel] = useState("")
  const [newBody, setNewBody] = useState("")
  const [newIsDefault, setNewIsDefault] = useState(false)
  const [creating, setCreating] = useState(false)

  const [editingId, setEditingId] = useState<string | null>(null)
  const [editLabel, setEditLabel] = useState("")
  const [editBody, setEditBody] = useState("")
  const [editIsDefault, setEditIsDefault] = useState(false)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/admin/signatures")
      const json = (await res.json()) as { success: boolean; data?: SignatureItem[]; error?: string }
      if (!json.success) throw new Error(json.error ?? "خطا در بارگذاری امضاها")
      setSignatures(json.data ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : "خطای ناشناخته")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!newLabel.trim() || !newBody.trim()) return
    setCreating(true)
    try {
      const res = await fetch("/api/admin/signatures", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          label: newLabel.trim(),
          body: newBody.trim(),
          isDefault: newIsDefault,
        }),
      })
      const json = (await res.json()) as { success: boolean; error?: string }
      if (!json.success) throw new Error(json.error ?? "خطا در ثبت امضا")
      toastSuccess("امضا ثبت شد")
      setNewLabel("")
      setNewBody("")
      setNewIsDefault(false)
      setShowForm(false)
      await load()
    } catch (err) {
      toastError(err instanceof Error ? err.message : "خطای ناشناخته")
    } finally {
      setCreating(false)
    }
  }

  function startEdit(sig: SignatureItem) {
    setEditingId(sig.id)
    setEditLabel(sig.label)
    setEditBody(sig.body)
    setEditIsDefault(sig.isDefault)
  }

  function cancelEdit() {
    setEditingId(null)
    setEditLabel("")
    setEditBody("")
    setEditIsDefault(false)
  }

  async function handleSave(id: string) {
    if (!editLabel.trim() || !editBody.trim()) return
    setSaving(true)
    try {
      const res = await fetch(`/api/admin/signatures/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          label: editLabel.trim(),
          body: editBody.trim(),
          isDefault: editIsDefault,
        }),
      })
      const json = (await res.json()) as { success: boolean; error?: string }
      if (!json.success) throw new Error(json.error ?? "خطا در ذخیره")
      toastSuccess("امضا به‌روزرسانی شد")
      cancelEdit()
      await load()
    } catch (err) {
      toastError(err instanceof Error ? err.message : "خطای ناشناخته")
    } finally {
      setSaving(false)
    }
  }

  async function handleSetDefault(id: string) {
    try {
      const res = await fetch(`/api/admin/signatures/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isDefault: true }),
      })
      const json = (await res.json()) as { success: boolean; error?: string }
      if (!json.success) throw new Error(json.error ?? "خطا")
      await load()
    } catch (err) {
      toastError(err instanceof Error ? err.message : "خطای ناشناخته")
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("این امضا حذف شود؟")) return
    try {
      const res = await fetch(`/api/admin/signatures/${id}`, { method: "DELETE" })
      const json = (await res.json()) as { success: boolean; error?: string }
      if (!json.success) throw new Error(json.error ?? "خطا در حذف")
      toastSuccess("امضا حذف شد")
      await load()
    } catch (err) {
      toastError(err instanceof Error ? err.message : "خطای ناشناخته")
    }
  }

  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-sm">امضاهای من</h3>
        {!showForm && (
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90"
          >
            افزودن امضا
          </button>
        )}
      </div>

      <p className="text-xs text-muted-foreground">
        امضاها به انتهای پاسخ‌های پشتیبانی اضافه می‌شوند. می‌توانید در هر پاسخ امضای متفاوت انتخاب کنید.
      </p>

      {/* New signature form */}
      {showForm && (
        <form onSubmit={handleCreate} className="space-y-3 rounded-lg border border-dashed border-border p-3">
          <div>
            <label className="block text-xs font-medium mb-1">عنوان</label>
            <input
              type="text"
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              maxLength={MAX_LABEL}
              placeholder="مثلاً: رسمی، کوتاه"
              className="w-full rounded-lg border border-input bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">متن امضا</label>
            <textarea
              value={newBody}
              onChange={(e) => setNewBody(e.target.value)}
              rows={3}
              maxLength={MAX_BODY}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm resize-y focus:outline-none focus:ring-2 focus:ring-ring"
              required
            />
            <span className="text-[11px] text-muted-foreground">
              {newBody.length.toLocaleString("fa-IR")}/{MAX_BODY.toLocaleString("fa-IR")}
            </span>
          </div>
          <label className="flex items-center gap-2 text-xs">
            <input
              type="checkbox"
              checked={newIsDefault}
              onChange={(e) => setNewIsDefault(e.target.checked)}
            />
            انتخاب به عنوان امضای پیش‌فرض
          </label>
          <div className="flex items-center gap-2">
            <button
              type="submit"
              disabled={creating || !newLabel.trim() || !newBody.trim()}
              className="rounded-lg bg-primary px-4 py-1.5 text-xs font-medium text-primary-foreground disabled:opacity-50"
            >
              {creating ? "در حال ثبت..." : "ثبت"}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowForm(false)
                setNewLabel("")
                setNewBody("")
                setNewIsDefault(false)
              }}
              className="rounded-lg border border-input px-4 py-1.5 text-xs"
            >
              انصراف
            </button>
          </div>
        </form>
      )}

      {/* List */}
      {loading ? (
        <p className="text-sm text-muted-foreground">در حال بارگذاری...</p>
      ) : error ? (
        <p className="text-sm text-red-600">{error}</p>
      ) : signatures.length === 0 ? (
        <p className="text-sm text-muted-foreground">هنوز امضایی ثبت نشده</p>
      ) : (
        <ul className="space-y-3">
          {signatures.map((sig) => (
            <li key={sig.id} className="rounded-lg border border-border bg-muted/30 px-3 py-2.5">
              {editingId === sig.id ? (
                <div className="space-y-2">
                  <input
                    type="text"
                    value={editLabel}
                    onChange={(e) => setEditLabel(e.target.value)}
                    maxLength={MAX_LABEL}
                    className="w-full rounded-lg border border-input bg-background px-3 py-1.5 text-sm"
                  />
                  <textarea
                    value={editBody}
                    onChange={(e) => setEditBody(e.target.value)}
                    rows={3}
                    maxLength={MAX_BODY}
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm resize-y"
                  />
                  <label className="flex items-center gap-2 text-xs">
                    <input
                      type="checkbox"
                      checked={editIsDefault}
                      onChange={(e) => setEditIsDefault(e.target.checked)}
                    />
                    امضای پیش‌فرض
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleSave(sig.id)}
                      disabled={saving}
                      className="rounded-lg bg-primary px-3 py-1 text-xs font-medium text-primary-foreground disabled:opacity-50"
                    >
                      ذخیره
                    </button>
                    <button
                      type="button"
                      onClick={cancelEdit}
                      className="rounded-lg border border-input px-3 py-1 text-xs"
                    >
                      انصراف
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{sig.label}</span>
                      {sig.isDefault && (
                        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                          پیش‌فرض
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5">
                      {!sig.isDefault && (
                        <button
                          type="button"
                          onClick={() => handleSetDefault(sig.id)}
                          className="text-[11px] text-muted-foreground hover:text-foreground"
                        >
                          پیش‌فرض شود
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => startEdit(sig)}
                        className="text-[11px] text-muted-foreground hover:text-foreground"
                      >
                        ویرایش
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(sig.id)}
                        className="text-[11px] text-muted-foreground hover:text-destructive"
                      >
                        حذف
                      </button>
                    </div>
                  </div>
                  <p className="mt-1.5 whitespace-pre-wrap text-xs text-muted-foreground">{sig.body}</p>
                </>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
