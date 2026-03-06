"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { format } from "date-fns-jalali"
import { ArrowRight } from "lucide-react"

interface BroadcastItem {
  id: string
  subject: string
  body: string
  targetType: string
  recipientCount: number
  sendSms: boolean
  sentAt: string
  sentByAdmin: { displayName: string }
}

const TARGET_LABELS: Record<string, string> = {
  ALL: "همه دفاتر",
  ONE: "یک دفتر",
  FILTERED: "فیلترشده",
}

export default function BroadcastHistoryPage() {
  const [broadcasts, setBroadcasts] = useState<BroadcastItem[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    fetch(`/api/admin/broadcast?page=${page}`)
      .then((r) => r.json())
      .then((j) => {
        if (j.success) {
          setBroadcasts(j.data.broadcasts)
          setTotal(j.data.total)
        }
      })
      .finally(() => setLoading(false))
  }, [page])

  const totalPages = Math.ceil(total / 20)

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Link href="/admin/broadcast" className="text-muted-foreground hover:text-foreground">
          <ArrowRight className="h-4 w-4" />
        </Link>
        <h1 className="text-xl font-bold">تاریخچه پیام‌های همگانی</h1>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">در حال بارگذاری...</p>
      ) : broadcasts.length === 0 ? (
        <div className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">
          هیچ پیامی ارسال نشده است
        </div>
      ) : (
        <>
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-muted/50">
                <tr>
                  <th className="px-4 py-3 text-start font-medium">تاریخ</th>
                  <th className="px-4 py-3 text-start font-medium">موضوع</th>
                  <th className="px-4 py-3 text-start font-medium">مخاطبان</th>
                  <th className="px-4 py-3 text-start font-medium">دریافت‌کنندگان</th>
                  <th className="px-4 py-3 text-start font-medium">SMS</th>
                  <th className="px-4 py-3 text-start font-medium">ارسال‌کننده</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {broadcasts.map((b) => (
                  <tr key={b.id} className="hover:bg-muted/30">
                    <td className="px-4 py-3 text-muted-foreground text-xs">
                      {format(new Date(b.sentAt), "yyyy/MM/dd HH:mm")}
                    </td>
                    <td className="px-4 py-3 font-medium max-w-xs">
                      <div className="truncate">{b.subject}</div>
                      <div className="text-xs text-muted-foreground truncate">{b.body}</div>
                    </td>
                    <td className="px-4 py-3">{TARGET_LABELS[b.targetType] ?? b.targetType}</td>
                    <td className="px-4 py-3">{b.recipientCount.toLocaleString("fa-IR")}</td>
                    <td className="px-4 py-3">{b.sendSms ? "✓" : "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground">{b.sentByAdmin.displayName}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex justify-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="rounded-md border px-3 py-1 text-sm disabled:opacity-40"
              >
                قبلی
              </button>
              <span className="text-sm text-muted-foreground py-1">
                {page.toLocaleString("fa-IR")} از {totalPages.toLocaleString("fa-IR")}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="rounded-md border px-3 py-1 text-sm disabled:opacity-40"
              >
                بعدی
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
