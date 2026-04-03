"use client"

import { useRef, useState } from "react"
import { ImagePlus, Trash2, X, ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
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

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10 MB

export function PhotoGallery({ initialPhotos, fileId, canEdit, photoProcessingMode }: PhotoGalleryProps) {
  const [photos, setPhotos] = useState<FilePhoto[]>(initialPhotos)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)

  // ASK mode checkbox state — defaults to true (enhance + watermark on)
  const [askEnhance, setAskEnhance] = useState(true)
  const [askWatermark, setAskWatermark] = useState(true)

  const showEnhanceCheckbox = photoProcessingMode?.enhance === "ASK"
  const showWatermarkCheckbox = photoProcessingMode?.watermark === "ASK"

  const fileInputRef = useRef<HTMLInputElement>(null)

  // ── Upload ──────────────────────────────────────────────────────────────────

  async function handleFilesSelected(files: FileList) {
    setUploadError(null)
    setUploading(true)

    for (const file of Array.from(files)) {
      if (!file.type.startsWith("image/")) {
        setUploadError("فقط فایل‌های تصویری مجاز هستند")
        continue
      }
      if (file.size > MAX_FILE_SIZE) {
        setUploadError("حداکثر حجم هر تصویر ۱۰ مگابایت است")
        continue
      }

      const formData = new FormData()
      formData.append("file", file)
      formData.append("fileId", fileId)
      // Send client hints for ASK mode (server ignores them for ALWAYS/NEVER)
      formData.append("enhancePhoto", askEnhance ? "true" : "false")
      formData.append("addWatermark", askWatermark ? "true" : "false")

      try {
        const res = await fetch("/api/upload", { method: "POST", body: formData })
        const result = (await res.json()) as {
          success: boolean
          data?: FilePhoto
          error?: string
        }
        if (result.success && result.data) {
          setPhotos((prev) => [...prev, result.data!])
        } else {
          setUploadError(result.error ?? "خطا در بارگذاری تصویر")
        }
      } catch {
        setUploadError("خطا در اتصال به سرور")
      }
    }

    setUploading(false)
    // Reset file input so the same file can be re-selected after a failed upload
    if (fileInputRef.current) fileInputRef.current.value = ""
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

  if (photos.length === 0 && !canEdit) return null

  return (
    <div className="space-y-3">
      {/* Photo grid */}
      {photos.length > 0 && (
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
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={uploading}
            onClick={() => fileInputRef.current?.click()}
          >
            <ImagePlus className="h-4 w-4 rtl:ml-1.5 ltr:mr-1.5" />
            {uploading ? "در حال بارگذاری..." : "افزودن تصویر"}
          </Button>
          {uploadError && (
            <p className="text-xs text-destructive">{uploadError}</p>
          )}
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
