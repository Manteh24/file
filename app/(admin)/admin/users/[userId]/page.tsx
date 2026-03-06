"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { format } from "date-fns-jalali"
import { ArrowRight, AlertTriangle } from "lucide-react"

interface UserDetail {
  id: string
  username: string
  displayName: string
  email: string | null
  role: string
  isActive: boolean
  adminNote: string | null
  createdAt: string
  office: { id: string; name: string; city: string | null } | null
  sessions: Array<{ id: string; createdAt: string; expiresAt: string }>
}

export default function AdminUserDetailPage() {
  const params = useParams()
  const userId = params.userId as string

  const [user, setUser] = useState<UserDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [noteText, setNoteText] = useState("")
  const [noteLoading, setNoteLoading] = useState(false)
  const [noteSaved, setNoteSaved] = useState(false)
  const [tempPassword, setTempPassword] = useState<string | null>(null)
  const [resetLoading, setResetLoading] = useState(false)
  const [logoutLoading, setLogoutLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function load() {
    const res = await fetch(`/api/admin/users/${userId}`)
    const json = await res.json()
    if (json.success) {
      setUser(json.data)
      setNoteText(json.data.adminNote ?? "")
    }
    setLoading(false)
  }

  useEffect(() => { load() }, [userId])

  async function saveNote() {
    setNoteLoading(true)
    setNoteSaved(false)
    const res = await fetch(`/api/admin/users/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ adminNote: noteText }),
    })
    const json = await res.json()
    if (json.success) setNoteSaved(true)
    setNoteLoading(false)
  }

  async function forceLogout() {
    setLogoutLoading(true)
    setError(null)
    const res = await fetch(`/api/admin/users/${userId}/force-logout`, { method: "POST" })
    const json = await res.json()
    if (json.success) {
      await load()
    } else {
      setError(json.error ?? "خطا")
    }
    setLogoutLoading(false)
  }

  async function resetPassword() {
    setResetLoading(true)
    setError(null)
    setTempPassword(null)
    const res = await fetch(`/api/admin/users/${userId}/reset-password`, { method: "POST" })
    const json = await res.json()
    if (json.success) {
      setTempPassword(json.data.tempPassword)
      await load()
    } else {
      setError(json.error ?? "خطا")
    }
    setResetLoading(false)
  }

  if (loading) return <p className="text-sm text-muted-foreground">در حال بارگذاری...</p>
  if (!user) return <p className="text-sm text-red-600">کاربر یافت نشد</p>

  const roleLabel: Record<string, string> = {
    MANAGER: "مدیر",
    AGENT: "مشاور",
    SUPER_ADMIN: "ادمین ارشد",
    MID_ADMIN: "ادمین میانی",
  }

  return (
    <div className="space-y-8 max-w-2xl">
      <div className="flex items-center gap-2">
        <Link href="/admin/users" className="text-muted-foreground hover:text-foreground">
          <ArrowRight className="h-4 w-4" />
        </Link>
        <h1 className="text-xl font-bold">{user.displayName}</h1>
        <span className={`ms-2 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
          user.isActive
            ? "bg-green-100 text-green-700"
            : "bg-red-100 text-red-700"
        }`}>
          {user.isActive ? "فعال" : "غیرفعال"}
        </span>
      </div>

      {error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-900/20">{error}</p>
      )}

      {/* Profile */}
      <section className="rounded-lg border border-border p-5 space-y-3">
        <h2 className="font-semibold">اطلاعات کاربر</h2>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
          <dt className="text-muted-foreground">نام کاربری</dt>
          <dd className="font-mono">{user.username}</dd>
          <dt className="text-muted-foreground">ایمیل</dt>
          <dd>{user.email ?? "—"}</dd>
          <dt className="text-muted-foreground">نقش</dt>
          <dd>{roleLabel[user.role] ?? user.role}</dd>
          <dt className="text-muted-foreground">دفتر</dt>
          <dd>
            {user.office ? (
              <Link href={`/admin/offices/${user.office.id}`} className="text-primary hover:underline">
                {user.office.name}
              </Link>
            ) : "—"}
          </dd>
          <dt className="text-muted-foreground">تاریخ عضویت</dt>
          <dd>{format(new Date(user.createdAt), "yyyy/MM/dd")}</dd>
        </dl>
      </section>

      {/* Sessions */}
      <section className="rounded-lg border border-border p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">جلسات فعال ({user.sessions.length})</h2>
          <button
            onClick={forceLogout}
            disabled={logoutLoading || user.sessions.length === 0}
            className="rounded-md bg-red-100 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-200 disabled:opacity-50"
          >
            {logoutLoading ? "..." : "خروج اجباری"}
          </button>
        </div>
        {user.sessions.length === 0 ? (
          <p className="text-sm text-muted-foreground">جلسه فعالی وجود ندارد</p>
        ) : (
          <ul className="space-y-1 text-sm">
            {user.sessions.map((s) => (
              <li key={s.id} className="flex justify-between rounded bg-muted/40 px-3 py-1.5">
                <span className="text-muted-foreground">
                  از {format(new Date(s.createdAt), "yyyy/MM/dd HH:mm")}
                </span>
                <span className="text-muted-foreground text-xs">
                  انقضا: {format(new Date(s.expiresAt), "yyyy/MM/dd")}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Password Reset */}
      <section className="rounded-lg border border-border p-5 space-y-3">
        <h2 className="font-semibold">بازنشانی رمز عبور</h2>
        <p className="text-sm text-muted-foreground">
          یک رمز موقت تولید می‌شود، جلسات کاربر پاک می‌شود، و رمز از طریق SMS ارسال می‌شود.
        </p>
        <button
          onClick={resetPassword}
          disabled={resetLoading}
          className="flex items-center gap-2 rounded-md bg-amber-100 px-3 py-1.5 text-sm font-medium text-amber-700 hover:bg-amber-200 disabled:opacity-50"
        >
          <AlertTriangle className="h-3.5 w-3.5" />
          {resetLoading ? "در حال اجرا..." : "بازنشانی رمز"}
        </button>
        {tempPassword && (
          <div className="rounded-md bg-green-50 px-4 py-3 dark:bg-green-900/20">
            <p className="text-xs text-muted-foreground mb-1">رمز موقت (یک‌بار نمایش داده می‌شود):</p>
            <p className="font-mono text-lg font-bold tracking-widest text-green-700 dark:text-green-400">
              {tempPassword}
            </p>
          </div>
        )}
      </section>

      {/* Admin Note */}
      <section className="rounded-lg border border-border p-5 space-y-3">
        <h2 className="font-semibold">یادداشت ادمین</h2>
        <p className="text-xs text-muted-foreground">این یادداشت فقط برای تیم ادمین قابل مشاهده است</p>
        <textarea
          value={noteText}
          onChange={(e) => { setNoteText(e.target.value); setNoteSaved(false) }}
          rows={4}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          placeholder="یادداشت دستی..."
        />
        <div className="flex items-center gap-3">
          <button
            onClick={saveNote}
            disabled={noteLoading}
            className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {noteLoading ? "در حال ذخیره..." : "ذخیره"}
          </button>
          {noteSaved && <span className="text-sm text-green-600">ذخیره شد</span>}
        </div>
      </section>
    </div>
  )
}
