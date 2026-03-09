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

const STEPS: Step[] = [
  {
    id: "welcome",
    title: "به املاکبین خوش آمدید 👋",
    description:
      "چند ثانیه وقت بگذارید تا با امکانات اصلی پلتفرم آشنا شوید. می‌توانید هر زمان این راهنما را رد کنید.",
  },
  {
    id: "files",
    targetId: "nav-files",
    title: "فایل‌های ملکی",
    description:
      "از اینجا فایل‌های دفتر را مدیریت کنید. برای ذخیره فایل تنها نوع معامله، موقعیت روی نقشه و یک شماره تماس کافی است.",
  },
  {
    id: "agents",
    targetId: "nav-agents",
    title: "مشاوران تیم",
    description:
      "مشاوران خود را اضافه کنید و هر فایل را به یک یا چند نفر اختصاص دهید تا آن‌ها هم دسترسی کامل داشته باشند.",
  },
  {
    id: "share",
    title: "اشتراک‌گذاری با مشتری",
    description:
      "در صفحه هر فایل، لینک اختصاصی با قیمت دلخواه بسازید و مستقیماً پیامک کنید. مشتری بدون نیاز به ورود، ملک را می‌بیند.",
  },
]

interface OnboardingTutorialProps {
  onOpenSidebar: () => void
}

export function OnboardingTutorial({ onOpenSidebar }: OnboardingTutorialProps) {
  const [stepIdx, setStepIdx] = useState(0)
  const [spotlightRect, setSpotlightRect] = useState<SpotlightRect | null>(null)
  const [dismissed, setDismissed] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const rafRef = useRef<number | null>(null)

  const step = STEPS[stepIdx]
  const isLast = stepIdx === STEPS.length - 1

  // Measure target element position for spotlight
  const measureTarget = useCallback(() => {
    if (!step.targetId) {
      setSpotlightRect(null)
      return
    }
    const el = document.querySelector<HTMLElement>(
      `[data-tutorial-id="${step.targetId}"]`
    )
    if (!el) {
      setSpotlightRect(null)
      return
    }
    const r = el.getBoundingClientRect()
    // If hidden (e.g. sidebar closed on mobile and animation not complete), show centered
    if (r.width === 0 || r.height === 0) {
      setSpotlightRect(null)
      return
    }
    setSpotlightRect({ top: r.top, left: r.left, width: r.width, height: r.height })
  }, [step.targetId])

  // On step change: open sidebar on mobile so target is visible, then measure
  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    setSpotlightRect(null)

    if (step.targetId) {
      onOpenSidebar()
      // Wait for sidebar slide-in animation (200ms) before measuring
      timerRef.current = setTimeout(measureTarget, 260)
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [step.targetId, onOpenSidebar, measureTarget])

  // Re-measure on viewport resize
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
    // Fire-and-forget — non-critical
    try {
      await fetch("/api/user/onboarding-complete", { method: "PATCH" })
    } catch {
      // ignore
    }
  }, [])

  const handleNext = useCallback(() => {
    if (isLast) {
      dismiss()
    } else {
      setStepIdx((i) => i + 1)
    }
  }, [isLast, dismiss])

  const handleBack = useCallback(() => {
    setStepIdx((i) => i - 1)
  }, [])

  if (dismissed) return null

  const pad = 8 // padding around spotlight element

  // Tooltip positioning:
  //   • With spotlight → anchor to the physical left of the element
  //     (sidebar is on the physical right in RTL, so tooltip goes into the content area)
  //   • Without spotlight → centered on screen
  const tooltipStyle: React.CSSProperties = spotlightRect
    ? {
        position: "fixed",
        // Place tooltip left of the spotlight (content-area side)
        right: window.innerWidth - spotlightRect.left + 16,
        top: Math.max(16, spotlightRect.top + spotlightRect.height / 2 - 110),
        width: "min(300px, calc(100vw - 32px))",
        zIndex: 10001,
      }
    : {
        position: "fixed",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        width: "min(380px, calc(100vw - 32px))",
        zIndex: 10001,
      }

  return (
    <>
      {/* ── Spotlight / backdrop ── */}
      {spotlightRect ? (
        // Single div: box-shadow darkens everything AROUND the element
        <div
          aria-hidden
          style={{
            position: "fixed",
            top: spotlightRect.top - pad,
            left: spotlightRect.left - pad,
            width: spotlightRect.width + pad * 2,
            height: spotlightRect.height + pad * 2,
            borderRadius: 10,
            boxShadow: "0 0 0 9999px rgba(0,0,0,0.65)",
            zIndex: 10000,
            pointerEvents: "none",
            transition: "top 0.25s ease, left 0.25s ease, width 0.25s ease, height 0.25s ease",
          }}
        />
      ) : (
        // Full-screen dark overlay for centered steps
        <div
          aria-hidden
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.65)",
            zIndex: 10000,
            pointerEvents: "none",
          }}
        />
      )}

      {/* ── Tooltip card ── */}
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

        {/* Step counter */}
        <p className="mb-1 text-[11px] text-muted-foreground">
          مرحله {stepIdx + 1} از {STEPS.length}
        </p>

        {/* Content */}
        <h3 className="mb-1.5 text-base font-semibold">{step.title}</h3>
        <p className="mb-4 text-sm leading-relaxed text-muted-foreground">
          {step.description}
        </p>

        {/* Actions */}
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
