"use client"

import { useState } from "react"
import { ChevronDown, ChevronUp, Download } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { DivarImportResult } from "@/types"

interface DivarImporterProps {
  onImport: (result: DivarImportResult) => void
}

export function DivarImporter({ onImport }: DivarImporterProps) {
  const [open, setOpen] = useState(true)
  const [url, setUrl] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [photoUrls, setPhotoUrls] = useState<string[]>([])

  async function handleImport() {
    setError(null)
    setPhotoUrls([])
    setLoading(true)

    try {
      const response = await fetch("/api/import/divar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      })

      const result = (await response.json()) as {
        success: boolean
        data?: DivarImportResult
        error?: string
      }

      if (!result.success || !result.data) {
        setError(result.error ?? "دریافت اطلاعات از دیوار ناموفق بود")
        return
      }

      if (result.data.photoUrls.length > 0) {
        setPhotoUrls(result.data.photoUrls)
      }

      onImport(result.data)
    } catch {
      setError("خطا در اتصال. لطفاً دوباره تلاش کنید.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="rounded-lg border border-dashed border-muted-foreground/30 bg-muted/20">
      {/* Header toggle */}
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
      >
        <span>وارد کردن از دیوار (اختیاری)</span>
        {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-3">
          {/* URL input + button */}
          <div className="flex gap-2">
            <Input
              type="url"
              dir="ltr"
              placeholder="https://divar.ir/v/..."
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              disabled={loading}
              className="flex-1 text-sm"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault()
                  if (url.trim()) void handleImport()
                }
              }}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={loading || !url.trim()}
              onClick={() => void handleImport()}
            >
              <Download className="h-4 w-4 rtl:ml-1.5 ltr:mr-1.5" />
              {loading ? "در حال دریافت..." : "دریافت اطلاعات"}
            </Button>
          </div>

          {/* Error message */}
          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          {/* Photo strip — shown after a successful import with photos */}
          {photoUrls.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs text-amber-600 dark:text-amber-400">
                تصاویر از دیوار — ممکن است منقضی شوند
              </p>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {photoUrls.slice(0, 8).map((src, i) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={i}
                    src={src}
                    alt={`تصویر دیوار ${i + 1}`}
                    className="h-16 w-24 shrink-0 rounded object-cover border"
                    onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none" }}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
