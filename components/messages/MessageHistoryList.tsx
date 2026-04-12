"use client"

import { useState, useEffect } from "react"
import { MessageSquare, Mail, Phone } from "lucide-react"
import { formatJalali } from "@/lib/utils"
import type { OfficeMessageSummary, MessageChannel } from "@/types"

const CHANNEL_CONFIG: Record<MessageChannel, { label: string; icon: React.ElementType; color: string }> = {
  NOTIFICATION: { label: "اعلان", icon: MessageSquare, color: "text-blue-500" },
  SMS: { label: "پیامک", icon: Phone, color: "text-emerald-500" },
  EMAIL: { label: "ایمیل", icon: Mail, color: "text-amber-500" },
}

export function MessageHistoryList({ refreshKey }: { refreshKey?: number }) {
  const [data, setData] = useState<OfficeMessageSummary[] | null>(null)
  const [error, setError] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    setError(false)
    fetch("/api/messages")
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setData(d.data as OfficeMessageSummary[])
        else setError(true)
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [refreshKey])

  if (loading) return <p className="text-sm text-muted-foreground py-4 text-center">در حال بارگذاری...</p>
  if (error) return <p className="text-sm text-destructive py-4 text-center">خطا در دریافت تاریخچه</p>
  if (!data || data.length === 0) return (
    <p className="text-sm text-muted-foreground py-4 text-center">هنوز هیچ پیامی ارسال نشده است.</p>
  )

  return (
    <div className="divide-y">
      {data.map((msg) => {
        const config = CHANNEL_CONFIG[msg.channel]
        const Icon = config.icon
        return (
          <div key={msg.id} className="py-3 flex items-start gap-3">
            <div className={`mt-0.5 shrink-0 ${config.color}`}>
              <Icon className="h-4 w-4" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-medium text-muted-foreground">{config.label}</span>
                {msg.filterLabel && (
                  <span className="text-xs text-muted-foreground">← {msg.filterLabel}</span>
                )}
                <span className="text-xs text-muted-foreground">
                  {msg.recipientCount.toLocaleString("fa-IR")} نفر
                </span>
              </div>
              {msg.subject && (
                <p className="text-sm font-medium mt-0.5">{msg.subject}</p>
              )}
              <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">{msg.body}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {msg.sender.displayName} · {formatJalali(new Date(msg.createdAt))}
              </p>
            </div>
          </div>
        )
      })}
    </div>
  )
}
