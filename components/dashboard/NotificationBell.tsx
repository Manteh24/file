"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Bell, Check } from "lucide-react"

interface Notification {
  id: string
  type: string
  title: string
  message: string
  read: boolean
  fileId: string | null
  createdAt: string
}

// Simple relative-time formatter using Intl.RelativeTimeFormat with Persian locale
function relativeTime(dateStr: string): string {
  const date = new Date(dateStr)
  const diffMs = date.getTime() - Date.now()
  const diffSec = Math.round(diffMs / 1000)
  const diffMin = Math.round(diffSec / 60)
  const diffHour = Math.round(diffMin / 60)
  const diffDay = Math.round(diffHour / 24)

  const rtf = new Intl.RelativeTimeFormat("fa", { numeric: "auto" })

  if (Math.abs(diffSec) < 60) return rtf.format(diffSec, "second")
  if (Math.abs(diffMin) < 60) return rtf.format(diffMin, "minute")
  if (Math.abs(diffHour) < 24) return rtf.format(diffHour, "hour")
  return rtf.format(diffDay, "day")
}

const POLL_INTERVAL_MS = 30_000

export function NotificationBell() {
  const router = useRouter()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [open, setOpen] = useState(false)
  const [markingAll, setMarkingAll] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications")
      const body = await res.json()
      if (body.success) {
        setNotifications(body.data as Notification[])
      }
    } catch {
      // Silently ignore — stale data is fine; next poll will retry
    }
  }, [])

  // Initial fetch + 30-second polling
  useEffect(() => {
    fetchNotifications()
    const timer = setInterval(fetchNotifications, POLL_INTERVAL_MS)
    return () => clearInterval(timer)
  }, [fetchNotifications])

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!open) return

    function handleOutsideClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }

    document.addEventListener("mousedown", handleOutsideClick)
    return () => document.removeEventListener("mousedown", handleOutsideClick)
  }, [open])

  const unreadCount = notifications.filter((n) => !n.read).length

  async function markOneRead(notification: Notification) {
    if (!notification.read) {
      // Optimistic update
      setNotifications((prev) =>
        prev.map((n) => (n.id === notification.id ? { ...n, read: true } : n))
      )
      try {
        await fetch(`/api/notifications/${notification.id}`, { method: "PATCH" })
      } catch {
        // Revert optimistic update on failure
        setNotifications((prev) =>
          prev.map((n) => (n.id === notification.id ? { ...n, read: false } : n))
        )
      }
    }
    if (notification.fileId) {
      setOpen(false)
      router.push(`/files/${notification.fileId}`)
    }
  }

  async function markAllRead() {
    setMarkingAll(true)
    // Optimistic update
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
    try {
      await fetch("/api/notifications/read-all", { method: "PATCH" })
    } catch {
      // Re-fetch to get accurate state
      await fetchNotifications()
    } finally {
      setMarkingAll(false)
    }
  }

  return (
    <div ref={containerRef} className="relative">
      {/* Bell button */}
      <button
        onClick={() => setOpen((prev) => !prev)}
        className="relative rounded-md p-2 text-muted-foreground hover:text-foreground"
        aria-label="اعلان‌ها"
      >
        <Bell className="h-5 w-5" />
        {/* Unread badge */}
        {unreadCount > 0 && (
          <span className="absolute top-1 start-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">
            {unreadCount > 9 ? "۹+" : unreadCount.toLocaleString("fa-IR")}
          </span>
        )}
      </button>

      {/* Dropdown panel */}
      {open && (
        <div className="absolute end-0 top-full mt-1 z-50 w-80 rounded-lg border bg-background shadow-lg">
          {/* Header */}
          <div className="flex items-center justify-between border-b px-4 py-2.5">
            <span className="text-sm font-semibold">اعلان‌ها</span>
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                disabled={markingAll}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground disabled:opacity-50"
              >
                <Check className="h-3.5 w-3.5" />
                خواندن همه
              </button>
            )}
          </div>

          {/* Notification list */}
          <ul className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <li className="px-4 py-6 text-center text-sm text-muted-foreground">
                اعلانی وجود ندارد
              </li>
            ) : (
              notifications.map((n) => (
                <li key={n.id}>
                  <button
                    onClick={() => markOneRead(n)}
                    className={`w-full text-start px-4 py-3 text-sm hover:bg-muted/50 transition-colors border-b last:border-0 ${
                      !n.read ? "bg-accent/40" : ""
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 space-y-0.5">
                        <p className="font-medium leading-snug">{n.title}</p>
                        <p className="text-muted-foreground text-xs leading-snug line-clamp-2">
                          {n.message}
                        </p>
                      </div>
                      {!n.read && (
                        <span className="mt-1 shrink-0 h-2 w-2 rounded-full bg-primary" />
                      )}
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {relativeTime(n.createdAt)}
                    </p>
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  )
}
