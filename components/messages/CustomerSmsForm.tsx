"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import type { CustomerType } from "@/types"

const TYPE_OPTIONS: { value: CustomerType; label: string }[] = [
  { value: "BUYER", label: "خریدار" },
  { value: "RENTER", label: "مستأجر" },
  { value: "SELLER", label: "فروشنده" },
  { value: "LANDLORD", label: "موجر" },
]

interface CustomerSmsFormProps {
  onSent?: () => void
}

export function CustomerSmsForm({ onSent }: CustomerSmsFormProps) {
  const [message, setMessage] = useState("")
  const [selectedTypes, setSelectedTypes] = useState<CustomerType[]>([])
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ type: "success" | "error"; text: string } | null>(null)

  function toggleType(type: CustomerType) {
    setSelectedTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!message.trim()) return
    setLoading(true)
    setResult(null)

    const res = await fetch("/api/messages/sms-customers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message,
        customerTypes: selectedTypes.length > 0 ? selectedTypes : undefined,
      }),
    })
    const data = await res.json()
    setLoading(false)

    if (data.success) {
      setResult({ type: "success", text: `پیامک برای ${data.data.recipientCount} مشتری ارسال شد` })
      setMessage("")
      onSent?.()
    } else {
      setResult({ type: "error", text: data.error ?? "خطایی رخ داد" })
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {result && (
        <p className={`text-sm ${result.type === "success" ? "text-emerald-600" : "text-destructive"}`}>
          {result.text}
        </p>
      )}

      {/* Type filter */}
      <div className="space-y-2">
        <label className="text-sm font-medium">فیلتر نوع مشتری</label>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setSelectedTypes([])}
            className={`px-3 py-1.5 text-sm rounded-full border transition-colors ${
              selectedTypes.length === 0
                ? "bg-[var(--color-teal-500)] text-white border-[var(--color-teal-500)]"
                : "border-[var(--color-border-subtle)] text-[var(--color-text-secondary)]"
            }`}
          >
            همه مشتریان
          </button>
          {TYPE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => toggleType(opt.value)}
              className={`px-3 py-1.5 text-sm rounded-full border transition-colors ${
                selectedTypes.includes(opt.value)
                  ? "bg-[var(--color-teal-500)] text-white border-[var(--color-teal-500)]"
                  : "border-[var(--color-border-subtle)] text-[var(--color-text-secondary)]"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-medium">متن پیامک *</label>
        <Textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="متن پیامک که برای مشتریان ارسال می‌شود..."
          rows={4}
          maxLength={300}
        />
        <p className="text-xs text-muted-foreground text-left">
          {message.length.toLocaleString("fa-IR")} / ۳۰۰
        </p>
      </div>

      <Button type="submit" disabled={loading || !message.trim()}>
        {loading ? "در حال ارسال..." : "ارسال پیامک"}
      </Button>
    </form>
  )
}
