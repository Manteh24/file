"use client"

import { useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { PageHeader } from "@/components/shared/PageHeader"
import { ArrowRight, Paperclip, X } from "lucide-react"
import Link from "next/link"

const CATEGORY_OPTIONS = [
  { value: "BILLING", label: "مالی" },
  { value: "TECHNICAL", label: "فنی" },
  { value: "ACCOUNT", label: "حساب کاربری" },
  { value: "FEATURE_REQUEST", label: "درخواست ویژگی" },
  { value: "BUG_REPORT", label: "گزارش خطا" },
  { value: "OTHER", label: "سایر" },
]

export default function NewTicketPage() {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [subject, setSubject] = useState("")
  const [category, setCategory] = useState("")
  const [message, setMessage] = useState("")
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState("")

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null
    setSelectedFile(file)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setIsSubmitting(true)

    try {
      const formData = new FormData()
      formData.set("subject", subject)
      formData.set("category", category)
      formData.set("message", message)
      if (selectedFile) formData.set("file", selectedFile)

      const res = await fetch("/api/support/tickets", {
        method: "POST",
        body: formData,
      })
      const data = await res.json()

      if (!data.success) {
        setError(data.error ?? "خطایی رخ داد")
        return
      }

      router.push(`/support/${data.data.id}`)
    } catch {
      setError("خطا در ارسال تیکت")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <PageHeader
        title="تیکت جدید"
        actions={
          <Button asChild variant="ghost" size="sm">
            <Link href="/support">
              <ArrowRight className="h-4 w-4 ms-1" />
              بازگشت
            </Link>
          </Button>
        }
      />

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-md bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {/* Subject */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium" htmlFor="subject">
            موضوع <span className="text-destructive">*</span>
          </label>
          <input
            id="subject"
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            required
            minLength={5}
            maxLength={120}
            placeholder="خلاصه مشکل یا درخواست شما"
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>

        {/* Category */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium" htmlFor="category">
            دسته‌بندی <span className="text-destructive">*</span>
          </label>
          <select
            id="category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            required
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="">انتخاب کنید</option>
            {CATEGORY_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Message */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium" htmlFor="message">
            پیام <span className="text-destructive">*</span>
          </label>
          <textarea
            id="message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            required
            minLength={10}
            maxLength={4000}
            rows={6}
            placeholder="توضیح کامل مشکل یا درخواست خود را بنویسید..."
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-y"
          />
        </div>

        {/* File attachment */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium">پیوست (اختیاری)</label>
          {selectedFile ? (
            <div className="flex items-center gap-2 rounded-md border border-input bg-muted/40 px-3 py-2 text-sm">
              <Paperclip className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="flex-1 truncate">{selectedFile.name}</span>
              <button
                type="button"
                onClick={() => {
                  setSelectedFile(null)
                  if (fileInputRef.current) fileInputRef.current.value = ""
                }}
                className="text-muted-foreground hover:text-destructive"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 rounded-md border border-dashed border-input px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:border-foreground transition-colors"
            >
              <Paperclip className="h-4 w-4" />
              انتخاب تصویر
            </button>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
            className="hidden"
            onChange={handleFileChange}
          />
          <p className="text-xs text-muted-foreground">فرمت‌های مجاز: JPG، PNG، WEBP، HEIC — حداکثر ۱۰ مگابایت</p>
        </div>

        <Button type="submit" disabled={isSubmitting} className="w-full">
          {isSubmitting ? "در حال ارسال..." : "ارسال تیکت"}
        </Button>
      </form>
    </div>
  )
}
