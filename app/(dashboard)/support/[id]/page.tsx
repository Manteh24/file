"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { PageHeader } from "@/components/shared/PageHeader"
import { ArrowRight, Paperclip, X, Send } from "lucide-react"
import Link from "next/link"
import { format } from "date-fns-jalali"

interface MessageAuthor {
  displayName: string
  role: string
}

interface TicketMessage {
  id: string
  authorId: string
  isAdminReply: boolean
  body: string
  attachmentUrl: string | null
  createdAt: string
  author: MessageAuthor
}

interface TicketDetail {
  id: string
  subject: string
  category: string
  status: string
  createdAt: string
  updatedAt: string
  creator: { displayName: string; role: string }
  messages: TicketMessage[]
}

const STATUS_LABELS: Record<string, string> = {
  OPEN: "باز",
  IN_PROGRESS: "در حال بررسی",
  RESOLVED: "حل شده",
  CLOSED: "بسته",
}

const STATUS_COLORS: Record<string, string> = {
  OPEN: "bg-blue-100 text-blue-800",
  IN_PROGRESS: "bg-yellow-100 text-yellow-800",
  RESOLVED: "bg-green-100 text-green-800",
  CLOSED: "bg-zinc-100 text-zinc-600",
}

const CATEGORY_LABELS: Record<string, string> = {
  BILLING: "مالی",
  TECHNICAL: "فنی",
  ACCOUNT: "حساب کاربری",
  FEATURE_REQUEST: "درخواست ویژگی",
  BUG_REPORT: "گزارش خطا",
  OTHER: "سایر",
}

const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"]
const MAX_FILE_SIZE = 10 * 1024 * 1024

export default function TicketDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const [ticket, setTicket] = useState<TicketDetail | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [fetchError, setFetchError] = useState("")

  const [replyBody, setReplyBody] = useState("")
  const [replyFile, setReplyFile] = useState<File | null>(null)
  const [isSending, setIsSending] = useState(false)
  const [sendError, setSendError] = useState("")

  const [isClosing, setIsClosing] = useState(false)

  const fetchTicket = useCallback(async () => {
    try {
      const res = await fetch(`/api/support/tickets/${id}`)
      const data = await res.json()
      if (!data.success) {
        setFetchError(data.error ?? "خطا در بارگذاری تیکت")
        return
      }
      setTicket(data.data)
    } catch {
      setFetchError("خطا در ارتباط با سرور")
    } finally {
      setIsLoading(false)
    }
  }, [id])

  useEffect(() => {
    fetchTicket()
  }, [fetchTicket])

  useEffect(() => {
    if (ticket) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
    }
  }, [ticket])

  async function handleClose() {
    if (!ticket) return
    setIsClosing(true)
    try {
      const res = await fetch(`/api/support/tickets/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "close" }),
      })
      const data = await res.json()
      if (data.success) {
        setTicket((prev) => prev ? { ...prev, status: "CLOSED" } : prev)
      }
    } finally {
      setIsClosing(false)
    }
  }

  async function handleSendReply(e: React.FormEvent) {
    e.preventDefault()
    if (!replyBody.trim()) return
    setSendError("")
    setIsSending(true)

    try {
      const formData = new FormData()
      formData.set("body", replyBody)
      if (replyFile) formData.set("file", replyFile)

      const res = await fetch(`/api/support/tickets/${id}/messages`, {
        method: "POST",
        body: formData,
      })
      const data = await res.json()

      if (!data.success) {
        setSendError(data.error ?? "خطا در ارسال")
        return
      }

      setReplyBody("")
      setReplyFile(null)
      if (fileInputRef.current) fileInputRef.current.value = ""
      await fetchTicket()
    } catch {
      setSendError("خطا در ارتباط با سرور")
    } finally {
      setIsSending(false)
    }
  }

  const isClosed = ticket?.status === "CLOSED" || ticket?.status === "RESOLVED"

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <p className="text-muted-foreground text-sm">در حال بارگذاری...</p>
      </div>
    )
  }

  if (fetchError || !ticket) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <p className="text-sm text-destructive">{fetchError || "تیکت یافت نشد"}</p>
        <Button asChild variant="ghost" size="sm">
          <Link href="/support">بازگشت</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <PageHeader
        title={ticket.subject}
        actions={
          <Button asChild variant="ghost" size="sm">
            <Link href="/support">
              <ArrowRight className="h-4 w-4 ms-1" />
              بازگشت
            </Link>
          </Button>
        }
      />

      {/* Ticket meta */}
      <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
        <span
          className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLORS[ticket.status] ?? ""}`}
        >
          {STATUS_LABELS[ticket.status] ?? ticket.status}
        </span>
        <span>{CATEGORY_LABELS[ticket.category] ?? ticket.category}</span>
        <span>ایجاد: {format(new Date(ticket.createdAt), "yyyy/MM/dd")}</span>
        {(ticket.status === "OPEN" || ticket.status === "IN_PROGRESS") && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleClose}
            disabled={isClosing}
            className="ms-auto"
          >
            {isClosing ? "در حال بستن..." : "بستن تیکت"}
          </Button>
        )}
      </div>

      {/* Message thread */}
      <div className="space-y-4">
        {ticket.messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex flex-col gap-1 ${msg.isAdminReply ? "items-end" : "items-start"}`}
          >
            <div
              className={`max-w-[80%] rounded-xl px-4 py-3 text-sm ${
                msg.isAdminReply
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-foreground"
              }`}
            >
              <p className="whitespace-pre-wrap">{msg.body}</p>
              {msg.attachmentUrl && (
                <a
                  href={msg.attachmentUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 flex items-center gap-1.5 underline underline-offset-2 opacity-80 hover:opacity-100"
                >
                  <Paperclip className="h-3.5 w-3.5 shrink-0" />
                  مشاهده پیوست
                </a>
              )}
            </div>
            <p className="text-[11px] text-muted-foreground px-1">
              {msg.author.displayName} · {format(new Date(msg.createdAt), "yyyy/MM/dd HH:mm")}
            </p>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Reply form */}
      {isClosed ? (
        <div className="rounded-md border border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground text-center">
          این تیکت بسته شده است. برای مشکل جدید، تیکت جدید ثبت کنید.
        </div>
      ) : (
        <form onSubmit={handleSendReply} className="space-y-3 border-t border-border pt-4">
          {sendError && (
            <p className="text-sm text-destructive">{sendError}</p>
          )}
          <textarea
            value={replyBody}
            onChange={(e) => setReplyBody(e.target.value)}
            required
            rows={4}
            placeholder="پاسخ خود را بنویسید..."
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-y"
          />

          {/* Attachment row */}
          <div className="flex items-center gap-3">
            {replyFile ? (
              <div className="flex flex-1 items-center gap-2 rounded-md border border-input bg-muted/40 px-3 py-1.5 text-xs">
                <Paperclip className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <span className="flex-1 truncate">{replyFile.name}</span>
                <button
                  type="button"
                  onClick={() => {
                    setReplyFile(null)
                    if (fileInputRef.current) fileInputRef.current.value = ""
                  }}
                  className="text-muted-foreground hover:text-destructive"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <Paperclip className="h-4 w-4" />
                پیوست
              </button>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept={ACCEPTED_TYPES.join(",")}
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0] ?? null
                if (f && f.size > MAX_FILE_SIZE) {
                  setSendError("حجم فایل بیش از ۱۰ مگابایت است")
                  return
                }
                setReplyFile(f)
              }}
            />
            <Button type="submit" size="sm" disabled={isSending} className="ms-auto">
              <Send className="h-4 w-4 ms-1" />
              {isSending ? "ارسال..." : "ارسال"}
            </Button>
          </div>
        </form>
      )}
    </div>
  )
}
