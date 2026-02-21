"use client"

import { useState } from "react"
import { Send, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"

interface Contact {
  name: string | null
  phone: string
}

interface SmsPanelProps {
  // Pre-filled phone — e.g. from a customer record. User can still edit it.
  defaultPhone?: string
  // Pre-filled message — e.g. from a template. User can edit before sending.
  defaultMessage: string
  // If provided, renders a quick-select dropdown that fills the phone input.
  contacts?: Contact[]
}

export function SmsPanel({ defaultPhone = "", defaultMessage, contacts }: SmsPanelProps) {
  const [phone, setPhone] = useState(defaultPhone)
  const [message, setMessage] = useState(defaultMessage)
  const [sending, setSending] = useState(false)
  const [result, setResult] = useState<{ type: "success" | "error"; text: string } | null>(null)

  async function handleSend() {
    setSending(true)
    setResult(null)

    try {
      const res = await fetch("/api/sms/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: phone.trim(), message: message.trim() }),
      })
      const body = await res.json()
      if (body.success) {
        setResult({ type: "success", text: "پیامک با موفقیت ارسال شد" })
      } else {
        setResult({ type: "error", text: body.error ?? "خطا در ارسال پیامک" })
      }
    } catch {
      setResult({ type: "error", text: "خطا در ارتباط با سرور" })
    } finally {
      setSending(false)
    }
  }

  const canSend = phone.trim().length > 0 && message.trim().length > 0 && !sending

  return (
    <div className="space-y-3">
      {/* Contact quick-select — only shown when contacts are provided */}
      {contacts && contacts.length > 0 && (
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">انتخاب سریع مخاطب</label>
          <select
            defaultValue=""
            onChange={(e) => { if (e.target.value) setPhone(e.target.value) }}
            className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="">-- از مخاطبین فایل انتخاب کنید --</option>
            {contacts.map((c) => (
              <option key={c.phone} value={c.phone}>
                {c.name ? `${c.name} (${c.phone})` : c.phone}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Phone input — always shown, editable */}
      <div className="space-y-1">
        <label className="text-xs text-muted-foreground">شماره موبایل گیرنده</label>
        <input
          type="text"
          inputMode="numeric"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="09123456789"
          className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          dir="ltr"
        />
      </div>

      {/* Message textarea */}
      <div className="space-y-1">
        <label className="text-xs text-muted-foreground">متن پیامک</label>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={4}
          maxLength={500}
          placeholder="متن پیامک را اینجا بنویسید..."
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
        />
        <p className="text-xs text-muted-foreground text-end">
          {message.length} / ۵۰۰
        </p>
      </div>

      {/* Result feedback */}
      {result && (
        <p className={`text-xs ${result.type === "success" ? "text-green-600" : "text-destructive"}`}>
          {result.text}
        </p>
      )}

      <Button size="sm" onClick={handleSend} disabled={!canSend}>
        {sending ? (
          <Loader2 className="h-3.5 w-3.5 rtl:ml-1.5 ltr:mr-1.5 animate-spin" />
        ) : (
          <Send className="h-3.5 w-3.5 rtl:ml-1.5 ltr:mr-1.5" />
        )}
        ارسال پیامک
      </Button>
    </div>
  )
}
