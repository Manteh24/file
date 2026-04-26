"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { X } from "lucide-react"

type SpotlightRect = { top: number; left: number; width: number; height: number }

type Step = {
  id: string
  /** data-tutorial-id of the element to spotlight. Absent = centered card. */
  targetId?: string
  title: string
  description: string
}

type StepFlavor = "all" | "mobile-only"

interface DefinedStep extends Step {
  flavor?: StepFlavor
}

const ALL_STEPS: DefinedStep[] = [
  {
    id: "welcome",
    title: "به املاکبین خوش آمدید 👋",
    description:
      "چند ثانیه وقت بگذارید تا با امکانات اصلی آشنا شوید. می‌توانید هر زمان این راهنما را رد کنید.",
  },
  {
    id: "files",
    targetId: "nav-files",
    title: "فایل‌های ملکی",
    description:
      "از اینجا فایل‌ها را مدیریت کنید. برای ثبت سریع، تنها نوع معامله، موقعیت روی نقشه و یک شماره تماس کافی است. لینک اشتراک‌گذاری هم از صفحه هر فایل ساخته می‌شود.",
  },
  {
    id: "quick-create",
    targetId: "nav-quick-create",
    title: "ایجاد سریع",
    description:
      "با دکمه + در منوی پایین، در هر لحظه فایل، مشتری، قرارداد یا رویداد تقویم جدید بسازید — بدون رفتن به صفحه مربوطه.",
  },
  {
    id: "crm",
    targetId: "nav-crm",
    title: "مدیریت مشتریان",
    description:
      "مشتریان را با نوع (خریدار، مستاجر، فروشنده، مالک) ثبت کنید و تاریخچه تماس‌ها و معاملات هر کدام را در یک‌جا ببینید.",
  },
  {
    id: "calendar",
    targetId: "nav-calendar",
    title: "تقویم و یادآوری‌ها",
    description:
      "جلسات بازدید، یادآور تماس و رویدادهای دفتر را اضافه کنید. در زمان مقرر نوتیفیکیشن با صدای هشدار دریافت می‌کنید — حتی وقتی برنامه باز نیست.",
  },
  {
    id: "more",
    targetId: "nav-more",
    title: "امکانات بیشتر",
    description:
      "از منوی «بیشتر» به مشاوران، قراردادها، گزارش‌ها، مرکز پیام، تنظیمات، ارتقا پلن و پشتیبانی دسترسی دارید.",
    // The "بیشتر" tab lives in MobileBottomNav (lg:hidden), so on desktop the
    // sidebar already lists those items directly — this step is redundant.
    flavor: "mobile-only",
  },
]

// Tailwind `lg` breakpoint — matches MobileBottomNav (lg:hidden) and
// Sidebar (hidden on <lg). Below this width the bottom nav is visible
// and the «بیشتر» step makes sense; above it, that nav item doesn't exist.
const LG_BREAKPOINT = 1024

function useIsDesktop() {
  // Default to false on the server so SSR matches the mobile-first layout
  // and we don't briefly show the «بیشتر» step before hydration.
  const [isDesktop, setIsDesktop] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia(`(min-width: ${LG_BREAKPOINT}px)`)
    const update = () => setIsDesktop(mq.matches)
    update()
    mq.addEventListener("change", update)
    return () => mq.removeEventListener("change", update)
  }, [])
  return isDesktop
}

export function OnboardingTutorial() {
  const isDesktop = useIsDesktop()
  const STEPS: Step[] = isDesktop
    ? ALL_STEPS.filter((s) => s.flavor !== "mobile-only")
    : ALL_STEPS

  const [stepIdx, setStepIdx] = useState(0)
  // null = full-overlay (centered steps); rect = spotlight position
  const [spotlightRect, setSpotlightRect] = useState<SpotlightRect | null>(null)
  const [dismissed, setDismissed] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const rafRef = useRef<number | null>(null)

  // Clamp stepIdx if the breakpoint changes mid-tour and the array shrinks
  useEffect(() => {
    if (stepIdx > STEPS.length - 1) setStepIdx(STEPS.length - 1)
  }, [STEPS.length, stepIdx])

  const step = STEPS[Math.min(stepIdx, STEPS.length - 1)]
  const isLast = stepIdx >= STEPS.length - 1

  const measureTarget = useCallback(() => {
    if (!step.targetId) {
      setSpotlightRect(null)
      return
    }
    // Use querySelectorAll so we can skip elements that are hidden (e.g. the
    // mobile sidebar's copy of the nav item, which has display:none on desktop
    // via lg:hidden and therefore returns zero-dimension rects).
    const candidates = document.querySelectorAll<HTMLElement>(
      `[data-tutorial-id="${step.targetId}"]`
    )
    let el: HTMLElement | null = null
    for (const candidate of candidates) {
      const r = candidate.getBoundingClientRect()
      if (r.width > 0 && r.height > 0) { el = candidate; break }
    }
    if (!el) { setSpotlightRect(null); return }
    const r = el.getBoundingClientRect()
    setSpotlightRect({ top: r.top, left: r.left, width: r.width, height: r.height })
  }, [step.targetId])

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current)

    if (step.targetId) {
      // Don't null the rect during transition — keep previous spotlight position
      // so the div stays mounted and CSS transition has a start point.
      timerRef.current = setTimeout(measureTarget, 260)
    } else {
      // Centered step: collapse spotlight to full overlay immediately
      setSpotlightRect(null)
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [step.targetId, measureTarget])

  // Re-measure on resize
  useEffect(() => {
    const onResize = () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      rafRef.current = requestAnimationFrame(measureTarget)
    }
    window.addEventListener("resize", onResize)
    return () => {
      window.removeEventListener("resize", onResize)
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [measureTarget])

  const dismiss = useCallback(async () => {
    setDismissed(true)
    try {
      await fetch("/api/user/onboarding-complete", { method: "PATCH" })
    } catch {
      // ignore
    }
  }, [])

  const handleNext = useCallback(() => {
    if (isLast) dismiss()
    else setStepIdx((i) => i + 1)
  }, [isLast, dismiss])

  const handleBack = useCallback(() => setStepIdx((i) => i - 1), [])

  if (dismissed) return null

  const pad = 8

  // When spotlightRect is null (centered steps), collapse the spotlight div to a 0×0
  // point at the viewport center. The box-shadow then covers the whole screen like a
  // full overlay — and since the div is NEVER unmounted, CSS transitions always have a
  // valid start position (no more jump from 0,0).
  const cx = window.innerWidth / 2
  const cy = window.innerHeight / 2
  const sr = spotlightRect
  const divTop    = sr ? sr.top  - pad : cy
  const divLeft   = sr ? sr.left - pad : cx
  const divWidth  = sr ? sr.width  + pad * 2 : 0
  const divHeight = sr ? sr.height + pad * 2 : 0

  // Tooltip position: bottom-center on small screens when spotlight is active,
  // content-area anchor on desktop, centered card otherwise.
  const isMobile = window.innerWidth < 640
  // MobileBottomNav is ~4rem (h-16) tall + safe-area inset. Lift the card
  // above it so the «بعدی / قبلی» buttons aren't covered by the nav itself.
  const mobileBottomGap =
    "calc(4rem + env(safe-area-inset-bottom, 0px) + 16px)"
  const tooltipStyle: React.CSSProperties = (() => {
    if (sr && isMobile) {
      // Keep card above the bottom nav so it never overlaps the nav buttons
      return {
        position: "fixed",
        bottom: mobileBottomGap,
        left: "50%",
        transform: "translateX(-50%)",
        width: `calc(100vw - 32px)`,
        maxWidth: 360,
        zIndex: 10001,
      }
    }
    if (sr) {
      // Desktop: place in the content area (physically left of spotlight in RTL layout)
      const tooltipW = 300
      // How much space is to the left of the spotlight element
      const spaceLeft = sr.left - pad - 16
      if (spaceLeft >= tooltipW) {
        const right = window.innerWidth - sr.left + 16
        // Clamp so it never goes off either screen edge
        const clampedRight = Math.max(16, Math.min(right, window.innerWidth - tooltipW - 16))
        const top = Math.max(
          16,
          Math.min(
            sr.top + sr.height / 2 - 110,
            window.innerHeight - 260
          )
        )
        return { position: "fixed", right: clampedRight, top, width: tooltipW, zIndex: 10001 }
      }
      // Not enough space on either side — fall back to bottom-center (still above nav on mobile)
      return {
        position: "fixed",
        bottom: isMobile ? mobileBottomGap : 20,
        left: "50%",
        transform: "translateX(-50%)",
        width: Math.min(340, window.innerWidth - 32),
        zIndex: 10001,
      }
    }
    // Centered card (no spotlight)
    return {
      position: "fixed",
      top: "50%",
      left: "50%",
      transform: "translate(-50%, -50%)",
      width: "min(380px, calc(100vw - 32px))",
      zIndex: 10001,
    }
  })()

  return (
    <>
      {/*
        Single always-mounted div. When `sr` is null it is a 0×0 point at the viewport
        center so its box-shadow acts as a full-screen overlay. When `sr` is set it
        becomes the spotlight cutout. CSS transitions run continuously because the div
        is never unmounted — no more flash from (0, 0).
      */}
      <div
        aria-hidden
        style={{
          position: "fixed",
          top: divTop,
          left: divLeft,
          width: divWidth,
          height: divHeight,
          borderRadius: sr ? 10 : 0,
          boxShadow: "0 0 0 9999px rgba(0,0,0,0.65)",
          zIndex: 10000,
          pointerEvents: "none",
          transition:
            "top 0.3s ease, left 0.3s ease, width 0.3s ease, height 0.3s ease, border-radius 0.3s ease",
        }}
      />

      {/* Tooltip card */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`راهنمای شروع — مرحله ${stepIdx + 1} از ${STEPS.length}`}
        style={tooltipStyle}
        className="rounded-xl border border-border bg-background p-5 shadow-2xl"
      >
        {/* Progress dots + close */}
        <div className="mb-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1">
            {STEPS.map((_, i) => (
              <div
                key={i}
                className={[
                  "h-1.5 rounded-full transition-all duration-300",
                  i === stepIdx
                    ? "w-5 bg-primary"
                    : i < stepIdx
                    ? "w-1.5 bg-primary/40"
                    : "w-1.5 bg-muted-foreground/20",
                ].join(" ")}
              />
            ))}
          </div>
          <button
            onClick={dismiss}
            className="rounded p-0.5 text-muted-foreground transition-colors hover:text-foreground"
            aria-label="بستن راهنما"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <p className="mb-1 text-[11px] text-muted-foreground">
          مرحله {stepIdx + 1} از {STEPS.length}
        </p>

        <h3 className="mb-1.5 text-base font-semibold">{step.title}</h3>
        <p className="mb-4 text-sm leading-relaxed text-muted-foreground">
          {step.description}
        </p>

        <div className="flex items-center justify-between gap-2">
          <button
            onClick={dismiss}
            className="text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            رد شدن
          </button>
          <div className="flex gap-2">
            {stepIdx > 0 && (
              <button
                onClick={handleBack}
                className="rounded-lg border border-border px-3 py-1.5 text-sm transition-colors hover:bg-muted"
              >
                قبلی
              </button>
            )}
            <button
              onClick={handleNext}
              className="rounded-lg bg-primary px-4 py-1.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              {isLast ? "شروع کنید" : "بعدی"}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
