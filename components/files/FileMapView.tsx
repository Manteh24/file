"use client"

import dynamic from "next/dynamic"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { ChevronDown, ChevronUp, MapPinOff } from "lucide-react"
import { FileCard } from "@/components/files/FileCard"
import { FileMapPopup } from "@/components/files/FileMapPopup"
import type { FileMapPin } from "@/components/files/FileMapCanvas"
import type { PropertyFileSummary } from "@/types"

const FileMapCanvas = dynamic(
  () => import("@/components/files/FileMapCanvas").then((m) => m.FileMapCanvas),
  { ssr: false, loading: () => <div className="h-full w-full bg-[var(--color-surface-2)]" /> }
)

interface FileMapViewProps {
  files: PropertyFileSummary[]
}

const SHEET_PEEK = 180 // px visible when peeking
const SHEET_EXPANDED_RATIO = 0.85 // of viewport height

export function FileMapView({ files }: FileMapViewProps) {
  const [activeId, setActiveId] = useState<string | null>(null)
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const [showUnlocated, setShowUnlocated] = useState(false)

  const { located, unlocated } = useMemo(() => {
    const loc: PropertyFileSummary[] = []
    const unloc: PropertyFileSummary[] = []
    for (const f of files) {
      if (f.latitude != null && f.longitude != null) loc.push(f)
      else unloc.push(f)
    }
    return { located: loc, unlocated: unloc }
  }, [files])

  const pins: FileMapPin[] = useMemo(
    () =>
      located.map((f) => ({
        id: f.id,
        lat: f.latitude as number,
        lng: f.longitude as number,
      })),
    [located]
  )

  // Derived from activeId + located list. If the active file is filtered out,
  // activeFile becomes null naturally, and the popup won't render.
  const activeFile = useMemo(
    () => (activeId ? located.find((f) => f.id === activeId) ?? null : null),
    [activeId, located]
  )

  const listRef = useRef<HTMLDivElement>(null)

  // Scroll active card into view (desktop list)
  useEffect(() => {
    if (!activeId) return
    const el = listRef.current?.querySelector<HTMLElement>(`[data-file-id="${activeId}"]`)
    el?.scrollIntoView({ behavior: "smooth", block: "nearest" })
  }, [activeId])

  // Mobile carousel
  const carouselRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!activeId) return
    const el = carouselRef.current?.querySelector<HTMLElement>(`[data-file-id="${activeId}"]`)
    el?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" })
  }, [activeId])

  // On swipe, detect center card and make it active
  useEffect(() => {
    const container = carouselRef.current
    if (!container) return
    let timeout: ReturnType<typeof setTimeout> | null = null
    function onScroll() {
      if (timeout) clearTimeout(timeout)
      timeout = setTimeout(() => {
        if (!container) return
        const { left, width } = container.getBoundingClientRect()
        const centerX = left + width / 2
        const cards = container.querySelectorAll<HTMLElement>("[data-file-id]")
        let closest: { id: string; dist: number } | null = null
        cards.forEach((c) => {
          const r = c.getBoundingClientRect()
          const cx = r.left + r.width / 2
          const dist = Math.abs(cx - centerX)
          if (!closest || dist < closest.dist) {
            closest = { id: c.dataset.fileId as string, dist }
          }
        })
        if (closest && closest.id !== activeId) setActiveId(closest.id)
      }, 120)
    }
    container.addEventListener("scroll", onScroll, { passive: true })
    return () => {
      container.removeEventListener("scroll", onScroll)
      if (timeout) clearTimeout(timeout)
    }
  }, [activeId])

  // Bottom sheet drag
  const [sheetExpanded, setSheetExpanded] = useState(false)
  const sheetRef = useRef<HTMLDivElement>(null)
  const dragStateRef = useRef<{ startY: number; startTranslate: number; viewportH: number } | null>(null)
  const [dragTranslate, setDragTranslate] = useState<number | null>(null)

  const computedTranslate = useCallback((expanded: boolean, viewportH: number) => {
    // Sheet itself spans full viewport height; translateY shifts it down
    const expandedPx = Math.round(viewportH * (1 - SHEET_EXPANDED_RATIO))
    const peekPx = viewportH - SHEET_PEEK
    return expanded ? expandedPx : peekPx
  }, [])

  const onHandlePointerDown = (e: React.PointerEvent) => {
    const el = sheetRef.current
    if (!el) return
    el.setPointerCapture(e.pointerId)
    const currentTranslate = computedTranslate(sheetExpanded, window.innerHeight)
    dragStateRef.current = {
      startY: e.clientY,
      startTranslate: currentTranslate,
      viewportH: window.innerHeight,
    }
    setDragTranslate(currentTranslate)
  }

  const onHandlePointerMove = (e: React.PointerEvent) => {
    const s = dragStateRef.current
    if (!s) return
    const delta = e.clientY - s.startY
    const expandedPx = Math.round(s.viewportH * (1 - SHEET_EXPANDED_RATIO))
    const peekPx = s.viewportH - SHEET_PEEK
    const next = Math.max(expandedPx, Math.min(peekPx, s.startTranslate + delta))
    setDragTranslate(next)
  }

  const onHandlePointerUp = () => {
    const s = dragStateRef.current
    if (!s || dragTranslate == null) {
      dragStateRef.current = null
      setDragTranslate(null)
      return
    }
    const expandedPx = Math.round(s.viewportH * (1 - SHEET_EXPANDED_RATIO))
    const peekPx = s.viewportH - SHEET_PEEK
    const midpoint = (expandedPx + peekPx) / 2
    setSheetExpanded(dragTranslate < midpoint)
    dragStateRef.current = null
    setDragTranslate(null)
  }

  if (files.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center rounded-xl border border-dashed border-[var(--color-border)] text-sm text-[var(--color-text-tertiary)]">
        فایلی برای نمایش روی نقشه وجود ندارد
      </div>
    )
  }

  // ─── Desktop layout (lg+) ───────────────────────────────────────────────────
  const desktopHeight = "h-[calc(100vh-13rem)]"

  return (
    <>
      {/* Desktop: 60/40 split */}
      <div className={`hidden lg:flex ${desktopHeight} gap-4`}>
        <div className="relative flex-1 overflow-hidden rounded-xl border border-[var(--color-border)] min-w-0" style={{ flexBasis: "60%" }}>
          <FileMapCanvas
            pins={pins}
            activeFileId={activeId}
            hoveredFileId={hoveredId}
            onPinClick={setActiveId}
            onBackgroundClick={() => setActiveId(null)}
            popupContent={
              activeFile ? (
                <FileMapPopup file={activeFile} onClose={() => setActiveId(null)} />
              ) : null
            }
          />
        </div>

        <div
          ref={listRef}
          className="flex flex-col gap-2 overflow-y-auto pr-1"
          style={{ flexBasis: "40%" }}
        >
          {unlocated.length > 0 && (
            <UnlocatedBanner
              count={unlocated.length}
              show={showUnlocated}
              onToggle={() => setShowUnlocated((s) => !s)}
            />
          )}

          {located.map((file) => (
            <div
              key={file.id}
              data-file-id={file.id}
              onMouseEnter={() => setHoveredId(file.id)}
              onMouseLeave={() => setHoveredId(null)}
              onClick={() => setActiveId(file.id)}
              className={`rounded-xl transition-shadow ${
                activeId === file.id ? "ring-2 ring-[var(--color-teal-500)]" : ""
              }`}
            >
              <FileCard file={file} />
            </div>
          ))}

          {showUnlocated && unlocated.length > 0 && (
            <div className="mt-2 space-y-2">
              <p className="text-xs text-[var(--color-text-tertiary)]">فایل‌های بدون موقعیت</p>
              {unlocated.map((f) => (
                <FileCard key={f.id} file={f} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Mobile: full-screen map + draggable bottom sheet */}
      <div className="lg:hidden relative h-[calc(100vh-11rem)] overflow-hidden rounded-xl border border-[var(--color-border)]">
        <FileMapCanvas
          pins={pins}
          activeFileId={activeId}
          hoveredFileId={null}
          onPinClick={setActiveId}
          onBackgroundClick={() => setActiveId(null)}
          popupContent={
            activeFile ? (
              <FileMapPopup file={activeFile} onClose={() => setActiveId(null)} />
            ) : null
          }
        />

        <div
          ref={sheetRef}
          className="absolute inset-x-0 top-0 bg-[var(--color-surface-1)] border-t border-[var(--color-border)] rounded-t-2xl shadow-xl flex flex-col"
          style={{
            height: "100vh",
            transform: `translateY(${
              dragTranslate != null
                ? dragTranslate
                : computedTranslate(sheetExpanded, typeof window !== "undefined" ? window.innerHeight : 800)
            }px)`,
            transition: dragTranslate != null ? "none" : "transform 220ms ease",
            touchAction: "none",
          }}
        >
          <div
            className="flex flex-col items-center py-2 cursor-grab active:cursor-grabbing"
            onPointerDown={onHandlePointerDown}
            onPointerMove={onHandlePointerMove}
            onPointerUp={onHandlePointerUp}
            onPointerCancel={onHandlePointerUp}
          >
            <div className="h-1 w-10 rounded-full bg-[var(--color-border)]" />
            <p className="mt-1 text-[11px] text-[var(--color-text-tertiary)]">
              {located.length.toLocaleString("fa-IR")} فایل روی نقشه
            </p>
          </div>

          {/* Peek carousel (always rendered; expanded view uses vertical list below) */}
          {!sheetExpanded && (
            <div
              ref={carouselRef}
              dir="rtl"
              className="flex gap-3 overflow-x-auto px-4 pb-4 snap-x snap-mandatory"
              style={{ scrollbarWidth: "none" }}
            >
              {located.map((file) => (
                <div
                  key={file.id}
                  data-file-id={file.id}
                  onClick={() => setActiveId(file.id)}
                  className={`shrink-0 w-[80%] snap-center rounded-xl transition-shadow ${
                    activeId === file.id ? "ring-2 ring-[var(--color-teal-500)]" : ""
                  }`}
                >
                  <FileCard file={file} />
                </div>
              ))}
            </div>
          )}

          {/* Expanded list */}
          {sheetExpanded && (
            <div className="flex-1 overflow-y-auto px-4 pb-6 space-y-3">
              {unlocated.length > 0 && (
                <UnlocatedBanner
                  count={unlocated.length}
                  show={showUnlocated}
                  onToggle={() => setShowUnlocated((s) => !s)}
                />
              )}
              {located.map((file) => (
                <div
                  key={file.id}
                  data-file-id={file.id}
                  onClick={() => setActiveId(file.id)}
                  className={`rounded-xl transition-shadow ${
                    activeId === file.id ? "ring-2 ring-[var(--color-teal-500)]" : ""
                  }`}
                >
                  <FileCard file={file} />
                </div>
              ))}
              {showUnlocated && unlocated.length > 0 && (
                <div className="mt-2 space-y-2">
                  <p className="text-xs text-[var(--color-text-tertiary)]">فایل‌های بدون موقعیت</p>
                  {unlocated.map((f) => (
                    <FileCard key={f.id} file={f} />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  )
}

interface UnlocatedBannerProps {
  count: number
  show: boolean
  onToggle: () => void
}

function UnlocatedBanner({ count, show, onToggle }: UnlocatedBannerProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="flex w-full items-center justify-between rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-surface-2)] px-3 py-2 text-xs text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-3)]"
    >
      <span className="flex items-center gap-2">
        <MapPinOff className="h-3.5 w-3.5" />
        {count.toLocaleString("fa-IR")} فایل بدون موقعیت
      </span>
      {show ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
    </button>
  )
}
