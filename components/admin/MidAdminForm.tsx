"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import type { AdminOfficeSummary, MidAdminAssignment } from "@/types"

interface CreateMidAdminFormProps {
  offices: AdminOfficeSummary[]
}

export function CreateMidAdminForm({ offices }: CreateMidAdminFormProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [fields, setFields] = useState({
    username: "",
    displayName: "",
    email: "",
    password: "",
  })
  const [selectedOfficeIds, setSelectedOfficeIds] = useState<string[]>([])

  function toggleOffice(id: string) {
    setSelectedOfficeIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError("")
    try {
      // 1. Create the MID_ADMIN account
      const res = await fetch("/api/admin/mid-admins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(fields),
      })
      const json = await res.json()
      if (!res.ok) {
        setError(json.error ?? "خطا در ایجاد حساب")
        return
      }

      const newId: string = json.data.id

      // 2. Assign offices if any selected
      if (selectedOfficeIds.length > 0) {
        await fetch(`/api/admin/mid-admins/${newId}/assignments`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ officeIds: selectedOfficeIds }),
        })
      }

      router.refresh()
      setOpen(false)
      setFields({ username: "", displayName: "", email: "", password: "" })
      setSelectedOfficeIds([])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mt-6">
      {!open ? (
        <Button variant="outline" onClick={() => setOpen(true)}>
          + افزودن عضو تیم
        </Button>
      ) : (
        <form
          onSubmit={handleSubmit}
          className="rounded-xl border border-border bg-card p-5 space-y-4"
        >
          <h3 className="text-sm font-semibold">افزودن عضو تیم</h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-muted-foreground mb-1">نام نمایشی</label>
              <input
                required
                value={fields.displayName}
                onChange={(e) => setFields((f) => ({ ...f, displayName: e.target.value }))}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">نام کاربری</label>
              <input
                required
                dir="ltr"
                value={fields.username}
                onChange={(e) => setFields((f) => ({ ...f, username: e.target.value }))}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">ایمیل (اختیاری)</label>
              <input
                type="email"
                dir="ltr"
                value={fields.email}
                onChange={(e) => setFields((f) => ({ ...f, email: e.target.value }))}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">رمز عبور</label>
              <input
                required
                type="password"
                dir="ltr"
                value={fields.password}
                onChange={(e) => setFields((f) => ({ ...f, password: e.target.value }))}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>

          {/* Office assignment multi-select */}
          <div>
            <label className="block text-xs text-muted-foreground mb-2">
              دفاتر مجاز ({selectedOfficeIds.length} انتخاب شده)
            </label>
            <div className="max-h-48 overflow-y-auto rounded-lg border border-border divide-y divide-border">
              {offices.map((office) => (
                <label
                  key={office.id}
                  className="flex items-center gap-3 px-3 py-2 hover:bg-muted/40 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selectedOfficeIds.includes(office.id)}
                    onChange={() => toggleOffice(office.id)}
                    className="h-4 w-4 rounded border-border"
                  />
                  <span className="text-sm">{office.name}</span>
                  {office.city && (
                    <span className="text-xs text-muted-foreground">— {office.city}</span>
                  )}
                </label>
              ))}
            </div>
          </div>

          {error && <p className="text-xs text-red-600">{error}</p>}

          <div className="flex gap-3">
            <Button type="submit" disabled={loading} size="sm">
              {loading ? "در حال ذخیره..." : "ایجاد حساب"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => { setOpen(false); setError("") }}
            >
              انصراف
            </Button>
          </div>
        </form>
      )}
    </div>
  )
}

// ─── Edit assignments for an existing MID_ADMIN ──────────────────────────────

interface EditAssignmentsFormProps {
  adminId: string
  offices: AdminOfficeSummary[]
  currentAssignments: MidAdminAssignment[]
}

export function EditAssignmentsForm({
  adminId,
  offices,
  currentAssignments,
}: EditAssignmentsFormProps) {
  const router = useRouter()
  const [selectedOfficeIds, setSelectedOfficeIds] = useState<string[]>(
    currentAssignments.map((a) => a.officeId)
  )
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState("")

  function toggleOffice(id: string) {
    setSelectedOfficeIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
    setSaved(false)
  }

  async function handleSave() {
    setLoading(true)
    setError("")
    setSaved(false)
    try {
      const res = await fetch(`/api/admin/mid-admins/${adminId}/assignments`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ officeIds: selectedOfficeIds }),
      })
      if (!res.ok) {
        const json = await res.json()
        setError(json.error ?? "خطا در ذخیره")
        return
      }
      setSaved(true)
      router.refresh()
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="max-h-96 overflow-y-auto rounded-xl border border-border divide-y divide-border">
        {offices.map((office) => (
          <label
            key={office.id}
            className="flex items-center gap-3 px-4 py-3 hover:bg-muted/40 cursor-pointer"
          >
            <input
              type="checkbox"
              checked={selectedOfficeIds.includes(office.id)}
              onChange={() => toggleOffice(office.id)}
              className="h-4 w-4 rounded border-border"
            />
            <span className="text-sm font-medium">{office.name}</span>
            {office.city && (
              <span className="text-xs text-muted-foreground">— {office.city}</span>
            )}
          </label>
        ))}
      </div>

      <div className="flex items-center gap-3">
        <Button onClick={handleSave} disabled={loading} size="sm">
          {loading ? "در حال ذخیره..." : `ذخیره (${selectedOfficeIds.length} دفتر)`}
        </Button>
        {saved && <span className="text-xs text-green-600">✓ ذخیره شد</span>}
        {error && <span className="text-xs text-red-600">{error}</span>}
      </div>
    </div>
  )
}
