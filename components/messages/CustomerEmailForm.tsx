"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import type { CustomerType } from "@/types"

const TYPE_OPTIONS: { value: CustomerType; label: string }[] = [
  { value: "BUYER", label: "خریدار" },
  { value: "RENTER", label: "مستأجر" },
  { value: "SELLER", label: "فروشنده" },
  { value: "LANDLORD", label: "موجر" },
]

interface CustomerEmailFormProps {
  onSent?: () => void
}

export function CustomerEmailForm({ onSent }: CustomerEmailFormProps) {
  const [subject, setSubject] = useState("")
  const [body, setBody] = useState("")
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
    if (!subject.trim() || !body.trim()) return
    setLoading(true)
    setResult(null)

    const res = await fetch("/api/messages/email-customers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        subject,
        body,
        customerTypes: selectedTypes.length > 0 ? selectedTypes : undefined,
      }),
    })
    const data = await res.json()
    setLoading(false)

    if (data.success) {
      setResult({ type: "success", text: `ایمیل برای ${data.data.recipientCount} مشتری ارسال شد` })
      setSubject("")
      setBody("")
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
            همه مشتریان (با ایمیل)
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
        <label className="text-sm font-medium">موضوع ایمیل *</label>
        <Input
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="موضوع ایمیل"
          maxLength={200}
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-medium">متن ایمیل *</label>
        <Textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="متن پیامی که برای مشتریان ایمیل می‌شود..."
          rows={6}
          maxLength={5000}
        />
        <p className="text-xs text-muted-foreground text-left">
          {body.length.toLocaleString("fa-IR")} / ۵۰۰۰
        </p>
      </div>

      <Button type="submit" disabled={loading || !subject.trim() || !body.trim()}>
        {loading ? "در حال ارسال..." : "ارسال ایمیل"}
      </Button>
    </form>
  )
}
