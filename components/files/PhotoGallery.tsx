"use client"

import { useRef, useState } from "react"
import { Camera, ImagePlus, Trash2, X, ChevronLeft, ChevronRight, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { toastError } from "@/lib/toast"
import type { FilePhoto } from "@/types"

interface PhotoProcessingMode {
  enhance: "ALWAYS" | "NEVER" | "ASK"
  watermark: "ALWAYS" | "NEVER" | "ASK"
}

interface PhotoGalleryProps {
  initialPhotos: FilePhoto[]
  fileId: string
  canEdit: boolean
  photoProcessingMode?: PhotoProcessingMode
}

interface InProgressUpload {
  tempId: string
  progress: number
  phase: "uploading" | "processing"
}

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10 MB

export function PhotoGallery({ initialPhotos, fileId, canEdit, photoProcessingMode }: PhotoGalleryProps) {
  const [photos, setPhotos] = useState<FilePhoto[]>(initialPhotos)
  const [inProgress, setInProgress] = useState<InProgressUpload[]>([])
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)

  // ASK mode checkbox state — defaults to true (enhance + watermark on)
  const [askEnhance, setAskEnhance] = useState(true)
  const [askWatermark, setAskWatermark] = useState(true)

  const showEnhanceCheckbox = photoProcessingMode?.enhance === "ASK"
  const showWatermarkCheckbox = photoProcessingMode?.watermark === "ASK"

  const fileInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)

  const uploading = inProgress.length > 0

  // ── Upload ──────────────────────────────────────────────────────────────────

  function uploadOne(file: File): Promise<void> {
    const tempId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    setInProgress((prev) => [...prev, { tempId, progress: 0, phase: "uploading" }])

    const formData = new FormData()
    formData.append("file", file)
    formData.append("fileId", fileId)
    formData.append("enhancePhoto", askEnhance ? "true" : "false")
    formData.append("addWatermark", askWatermark ? "true" : "false")

    return new Promise<void>((resolve) => {
      const xhr = new XMLHttpRequest()
      xhr.open("POST", "/api/upload")

      xhr.upload.addEventListener("progress", (e) => {
        if (!e.lengthComputable) return
        const pct = Math.round((e.loaded / e.total) * 100)
        setInProgress((prev) =>
          prev.map((u) =>
            u.tempId === tempId
              ? { ...u, progress: pct, phase: pct >= 100 ? "processing" : "uploading" }
              : u
          )
        )
      })

      xhr.upload.addEventListener("load", () => {
        // Bytes are out the door — server-side Sharp window starts now.
        setInProgress((prev) =>
          prev.map((u) =>
            u.tempId === tempId ? { ...u, progress: 100, phase: "processing" } : u
          )
        )
      })

      xhr.addEventListener("load", () => {
        try {
          const result = JSON.parse(xhr.responseText) as {
            success: boolean
            data?: FilePhoto
            error?: string
          }
          if (result.success && result.data) {
            setPhotos((prev) => [...prev, result.data!])
          } else {
            toastError(result.error ?? "خطا در بارگذاری تصویر")
          }
        } catch {
          toastError("خطا در بارگذاری تصویر")
        }
        setInProgress((prev) => prev.filter((u) => u.tempId !== tempId))
        resolve()
      })

      xhr.addEventListener("error", () => {
        toastError("خطا در اتصال به سرور")
        setInProgress((prev) => prev.filter((u) => u.tempId !== tempId))
        resolve()
      })

      xhr.addEventListener("abort", () => {
        setInProgress((prev) => prev.filter((u) => u.tempId !== tempId))
        resolve()
      })

      xhr.send(formData)
    })
  }

  async function handleFilesSelected(files: FileList) {
    for (const file of Array.from(files)) {
      if (!file.type.startsWith("image/")) {
        toastError("فقط فایل‌های تصویری مجاز هستند")
        continue
      }
      if (file.size > MAX_FILE_SIZE) {
        toastError("حداکثر حجم هر تصویر ۱۰ مگابایت است")
        continue
      }
      // Sequential to keep server pressure (and ordering) predictable.
      await uploadOne(file)
    }
    // Reset file input so the same file can be re-selected after a failed upload
    if (fileInputRef.current) fileInputRef.current.value = ""
    if (cameraInputRef.current) cameraInputRef.current.value = ""
  }

  // ── Delete ──────────────────────────────────────────────────────────────────

  async function handleDelete(photoId: string) {
    try {
      const res = await fetch(`/api/files/${fileId}/photos/${photoId}`, { method: "DELETE" })
      const result = (await res.json()) as { success: boolean; error?: string }
      if (result.success) {
        setPhotos((prev) => prev.filter((p) => p.id !== photoId))
        // Close lightbox if the deleted photo was open
        setLightboxIndex(null)
      }
    } catch {
      // Silent — the photo remains visible; user can retry
    }
  }

  // ── Lightbox navigation ─────────────────────────────────────────────────────

  function openLightbox(index: number) {
    setLightboxIndex(index)
  }

  function closeLightbox() {
    setLightboxIndex(null)
  }

  function goNext() {
    setLightboxIndex((i) => (i !== null ? (i + 1) % photos.length : null))
  }

  function goPrev() {
    setLightboxIndex((i) => (i !== null ? (i - 1 + photos.length) % photos.length : null))
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  if (photos.length === 0 && !canEdit && inProgress.length === 0) return null

  return (
    <div className="space-y-3">
      {/* Photo grid — includes in-progress placeholders */}
      {(photos.length > 0 || inProgress.length > 0) && (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {photos.map((photo, index) => (
            <div key={photo.id} className="relative group aspect-[4/3] overflow-hidden rounded-lg">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photo.url}
                alt={`تصویر ${index + 1}`}
                className="h-full w-full object-cover cursor-pointer transition-transform group-hover:scale-105"
                onClick={() => openLightbox(index)}
              />
              {canEdit && (
                <button
                  type="button"
                  onClick={() => handleDelete(photo.id)}
                  className="absolute top-1.5 left-1.5 rounded-full bg-black/60 p-1 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive"
                  aria-label="حذف تصویر"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          ))}

          {inProgress.map((u) => (
            <div
              key={u.tempId}
              className="relative aspect-[4/3] overflow-hidden rounded-lg"
              aria-live="polite"
            >
              <Skeleton className="absolute inset-0 rounded-lg" />
              {u.phase === "uploading" ? (
                <>
                  <div className="absolute inset-x-0 bottom-0 h-1 bg-muted-foreground/20">
                    <div
                      className="h-full bg-primary transition-[width] duration-150 ease-out"
                      style={{ width: `${u.progress}%` }}
                    />
                  </div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="rounded-full bg-background/85 px-2 py-0.5 text-xs font-medium tabular-nums text-foreground">
                      {u.progress.toLocaleString("fa-IR")}٪
                    </span>
                  </div>
                </>
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5">
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  <span className="text-xs text-muted-foreground">در حال پردازش...</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Upload controls */}
      {canEdit && (
        <div className="space-y-2">
          {/* ASK mode checkboxes — only shown when relevant mode is "ASK" */}
          {(showEnhanceCheckbox || showWatermarkCheckbox) && (
            <div className="flex flex-wrap gap-4 pb-1">
              {showEnhanceCheckbox && (
                <label className="flex items-center gap-1.5 cursor-pointer text-sm text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={askEnhance}
                    onChange={(e) => setAskEnhance(e.target.checked)}
                    className="accent-primary"
                  />
                  بهبود کیفیت عکس
                </label>
              )}
              {showWatermarkCheckbox && (
                <label className="flex items-center gap-1.5 cursor-pointer text-sm text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={askWatermark}
                    onChange={(e) => setAskWatermark(e.target.checked)}
                    className="accent-primary"
                  />
                  افزودن واترمارک لوگو
                </label>
              )}
            </div>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => {
              if (e.target.files?.length) handleFilesSelected(e.target.files)
            }}
          />
          {/* Camera input — capture="environment" triggers device camera on mobile */}
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => {
              if (e.target.files?.length) handleFilesSelected(e.target.files)
            }}
          />
          <div className="flex gap-2 flex-wrap">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={uploading}
              onClick={() => cameraInputRef.current?.click()}
            >
              <Camera className="h-4 w-4 rtl:ml-1.5 ltr:mr-1.5" />
              دوربین
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={uploading}
              onClick={() => fileInputRef.current?.click()}
            >
              <ImagePlus className="h-4 w-4 rtl:ml-1.5 ltr:mr-1.5" />
              {uploading ? "در حال بارگذاری..." : "انتخاب از گالری"}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            حداکثر ۲۰ تصویر · هر تصویر تا ۱۰ مگابایت · فرمت‌های JPEG، PNG، WebP
          </p>
        </div>
      )}

      {/* Lightbox */}
      {lightboxIndex !== null && photos[lightboxIndex] && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90"
          onClick={closeLightbox}
        >
          {/* Close */}
          <button
            type="button"
            className="absolute top-4 left-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
            onClick={closeLightbox}
          >
            <X className="h-5 w-5" />
          </button>

          {/* Counter */}
          <span className="absolute top-4 right-4 text-sm text-white/70">
            {(lightboxIndex + 1).toLocaleString('fa-IR')} / {photos.length.toLocaleString('fa-IR')}
          </span>

          {/* Image — stop click from bubbling to the overlay */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={photos[lightboxIndex].url}
            alt={`تصویر ${lightboxIndex + 1}`}
            className="max-h-[90vh] max-w-[90vw] rounded-lg object-contain"
            onClick={(e) => e.stopPropagation()}
          />

          {/* Prev / Next arrows — only shown when there are multiple photos */}
          {photos.length > 1 && (
            <>
              <button
                type="button"
                className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
                onClick={(e) => { e.stopPropagation(); goPrev() }}
              >
                <ChevronRight className="h-6 w-6" />
              </button>
              <button
                type="button"
                className="absolute left-4 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
                onClick={(e) => { e.stopPropagation(); goNext() }}
              >
                <ChevronLeft className="h-6 w-6" />
              </button>
            </>
          )}

          {/* Delete button in lightbox */}
          {canEdit && (
            <button
              type="button"
              className="absolute bottom-4 right-4 flex items-center gap-1.5 rounded-lg bg-destructive/80 px-3 py-1.5 text-sm text-white hover:bg-destructive"
              onClick={(e) => {
                e.stopPropagation()
                handleDelete(photos[lightboxIndex!].id)
              }}
            >
              <Trash2 className="h-4 w-4" />
              حذف
            </button>
          )}
        </div>
      )}
    </div>
  )
}
