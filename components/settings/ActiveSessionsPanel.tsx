"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Monitor, Smartphone, Laptop, Shield, X, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { formatJalali } from "@/lib/utils"

interface SessionItem {
  id: string
  createdAt: Date | string
  lastActiveAt: Date | string | null
  userAgent: string | null
}

interface ActiveSessionsPanelProps {
  sessions: SessionItem[]
  currentSessionId: string | undefined
}

function parseDevice(ua: string | null): { label: string; icon: "desktop" | "mobile" | "tablet" } {
  if (!ua) return { label: "دستگاه ناشناس", icon: "desktop" }
  const lower = ua.toLowerCase()
  if (/iphone|android.*mobile|mobile/.test(lower)) return { label: "موبایل", icon: "mobile" }
  if (/ipad|tablet/.test(lower)) return { label: "تبلت", icon: "tablet" }
  if (/mac|windows|linux/.test(lower)) return { label: "رایانه", icon: "desktop" }
  return { label: "دستگاه ناشناس", icon: "desktop" }
}

const DeviceIcon = ({ type }: { type: "desktop" | "mobile" | "tablet" }) => {
  if (type === "mobile") return <Smartphone className="h-4 w-4" />
  if (type === "tablet") return <Laptop className="h-4 w-4" />
  return <Monitor className="h-4 w-4" />
}

export function ActiveSessionsPanel({ sessions, currentSessionId }: ActiveSessionsPanelProps) {
  const router = useRouter()
  const [revoking, setRevoking] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function revokeSession(id: string) {
    setRevoking(id)
    setError(null)
    try {
      const res = await fetch(`/api/auth/sessions/${id}`, { method: "DELETE" })
      const data = (await res.json()) as { success: boolean; error?: string }
      if (!data.success) {
        setError(data.error ?? "خطا در لغو نشست")
        return
      }
      router.refresh()
    } catch {
      setError("خطا در اتصال به سرور")
    } finally {
      setRevoking(null)
    }
  }

  if (sessions.length === 0) return null

  return (
    <section className="space-y-4">
      <div className="flex items-center gap-3 pt-1">
        <span className="shrink-0 text-xs font-semibold text-muted-foreground/60">نشست‌های فعال</span>
        <div className="h-px flex-1 bg-border" />
      </div>

      <p className="text-xs text-muted-foreground">
        دستگاه‌هایی که در حال حاضر به حساب شما وارد شده‌اند. حداکثر ۲ نشست همزمان مجاز است.
      </p>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="space-y-2">
        {sessions.map((s, i) => {
          const device = parseDevice(s.userAgent)
          const isCurrent = s.id === currentSessionId
          const sessionLabel = isCurrent ? "این دستگاه" : `دستگاه ${(i + 1).toLocaleString("fa-IR")}`

          return (
            <div
              key={s.id}
              className="flex items-center gap-3 rounded-xl border border-border bg-muted/30 px-4 py-3"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-background text-muted-foreground">
                <DeviceIcon type={device.icon} />
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold">{device.label}</p>
                  {isCurrent && (
                    <span className="flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
                      <Shield className="h-2.5 w-2.5" />
                      {sessionLabel}
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  {s.lastActiveAt
                    ? `آخرین فعالیت: ${formatJalali(new Date(s.lastActiveAt))}`
                    : `ورود: ${formatJalali(new Date(s.createdAt))}`}
                </p>
              </div>

              {!isCurrent && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 shrink-0 p-0 text-muted-foreground hover:text-destructive"
                  onClick={() => revokeSession(s.id)}
                  disabled={revoking === s.id}
                  aria-label="خروج از این دستگاه"
                >
                  {revoking === s.id ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <X className="h-3.5 w-3.5" />
                  )}
                </Button>
              )}
            </div>
          )
        })}
      </div>
    </section>
  )
}
