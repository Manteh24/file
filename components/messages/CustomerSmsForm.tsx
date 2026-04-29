"use client"

import { useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { toastSuccess, toastError } from "@/lib/toast"
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

interface PreviewData {
  count: number
  sample: { name: string; phone: string } | null
}

export function CustomerSmsForm({ onSent }: CustomerSmsFormProps) {
  const [message, setMessage] = useState("")
  const [selectedTypes, setSelectedTypes] = useState<CustomerType[]>([])
  const [loading, setLoading] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [preview, setPreview] = useState<PreviewData | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)
  const previewAbort = useRef<AbortController | null>(null)

  function toggleType(type: CustomerType) {
    setSelectedTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    )
  }

  // Debounced recipient-count fetch. Aborts in-flight on rapid filter changes
  // so a slow request from an earlier filter can't overwrite a newer count.
  useEffect(() => {
    const handle = setTimeout(() => {
      previewAbort.current?.abort()
      const controller = new AbortController()
      previewAbort.current = controller
      setPreviewLoading(true)

      const params = new URLSearchParams()
      for (const t of selectedTypes) params.append("customerTypes", t)

      fetch(`/api/messages/sms-customers/preview?${params.toString()}`, {
        signal: controller.signal,
      })
        .then((res) => res.json())
        .then((body) => {
          if (controller.signal.aborted) return
          if (body.success) setPreview(body.data as PreviewData)
          else setPreview({ count: 0, sample: null })
        })
        .catch((err) => {
          if (err?.name === "AbortError") return
          setPreview({ count: 0, sample: null })
        })
        .finally(() => {
          if (!controller.signal.aborted) setPreviewLoading(false)
        })
    }, 300)

    return () => clearTimeout(handle)
  }, [selectedTypes])

  function handleOpenConfirm(e: React.FormEvent) {
    e.preventDefault()
    if (!message.trim() || !preview || preview.count === 0) return
    setConfirmOpen(true)
  }

  async function handleConfirmSend() {
    setLoading(true)
    try {
      const res = await fetch("/api/messages/sms-customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message,
          customerTypes: selectedTypes.length > 0 ? selectedTypes : undefined,
        }),
      })
      const data = await res.json()

      if (data.success) {
        toastSuccess(
          `پیامک برای ${data.data.recipientCount.toLocaleString("fa-IR")} مشتری ارسال شد`
        )
        setMessage("")
        setConfirmOpen(false)
        onSent?.()
      } else {
        toastError(data.error ?? "خطایی رخ داد")
      }
    } catch {
      toastError("خطا در ارتباط با سرور")
    } finally {
      setLoading(false)
    }
  }

  const count = preview?.count ?? 0
  const sample = preview?.sample
  const canSend = !loading && message.trim().length > 0 && count > 0

  return (
    <>
      <form onSubmit={handleOpenConfirm} className="space-y-4">
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

        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" disabled={!canSend}>
            ارسال پیامک
          </Button>
          <span className="text-sm text-muted-foreground">
            {previewLoading
              ? "در حال محاسبه گیرندگان..."
              : count > 0
              ? `ارسال به ${count.toLocaleString("fa-IR")} مشتری`
              : "هیچ مشتری‌ای با این فیلتر یافت نشد"}
          </span>
        </div>
      </form>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>تأیید ارسال انبوه پیامک</AlertDialogTitle>
            <AlertDialogDescription>
              این پیامک برای {count.toLocaleString("fa-IR")} مشتری ارسال خواهد شد و
              قابل لغو نیست.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-3 text-sm">
            {sample && (
              <div className="rounded-md bg-muted/50 px-3 py-2 text-muted-foreground">
                <span className="font-medium">مثلاً برای: </span>
                {sample.name} — <span dir="ltr">{sample.phone}</span>
              </div>
            )}
            <div className="rounded-md border bg-background px-3 py-2 whitespace-pre-wrap">
              {message}
            </div>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>انصراف</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmSend} disabled={loading}>
              {loading ? "در حال ارسال..." : "تأیید و ارسال"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
