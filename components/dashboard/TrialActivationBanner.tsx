"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Sparkles, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { activateProTrial } from "@/lib/trial-activation"

interface TrialActivationBannerProps {
  hasUsedTrial: boolean
}

const DISMISS_KEY = "trial_banner_dismissed_at"
const DISMISS_DURATION_MS = 7 * 24 * 60 * 60 * 1000 // 7 days

export function TrialActivationBanner({ hasUsedTrial }: TrialActivationBannerProps) {
  const router = useRouter()
  const [visible, setVisible] = useState(false)
  const [loading, setLoading] = useState(false)
  const [phoneError, setPhoneError] = useState(false)

  useEffect(() => {
    // Server already confirmed this phone has been used — no point showing the banner
    if (hasUsedTrial) return

    const dismissedAt = localStorage.getItem(DISMISS_KEY)
    if (dismissedAt) {
      const elapsed = Date.now() - parseInt(dismissedAt, 10)
      if (elapsed < DISMISS_DURATION_MS) return
    }

    setVisible(true)
  }, [hasUsedTrial])

  if (!visible) return null

  function handleDismiss() {
    localStorage.setItem(DISMISS_KEY, Date.now().toString())
    setVisible(false)
  }

  async function handleActivate() {
    setLoading(true)
    setPhoneError(false)

    const result = await activateProTrial()

    if (result.success) {
      router.refresh()
      return
    }

    if (result.reason === "phone_used") {
      setPhoneError(true)
      setLoading(false)
      return
    }

    if (result.reason === "already_trial" || result.reason === "already_paid") {
      // Stale client state — re-render to pick up latest subscription
      router.refresh()
      return
    }

    // Generic error — let user retry
    setLoading(false)
  }

  return (
    <div className="border-b border-teal-200 bg-teal-50 dark:bg-teal-950/30 dark:border-teal-800">
      <div className="flex items-start gap-3 px-4 py-3 lg:px-6">
        <Sparkles className="mt-0.5 size-5 shrink-0 text-teal-600 dark:text-teal-400" />

        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-teal-900 dark:text-teal-100">
            ۳۰ روز رایگان، همه امکانات حرفه‌ای
          </p>
          <p className="text-sm text-teal-800 dark:text-teal-200 mt-0.5">
            با فعال‌سازی دوره آزمایشی، پیامک، نقشه، گزارش‌های مالی و فایل نامحدود را بدون هزینه تجربه کنید.
          </p>
          {phoneError && (
            <p className="text-sm text-red-600 dark:text-red-400 mt-1">
              این شماره موبایل قبلاً از دوره آزمایشی استفاده کرده است
            </p>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            size="sm"
            variant="outline"
            className="text-teal-700 border-teal-300 hover:bg-teal-100 dark:text-teal-300 dark:border-teal-700 dark:hover:bg-teal-900/50"
            onClick={handleDismiss}
            disabled={loading}
          >
            بعداً
          </Button>
          <Button
            size="sm"
            className="bg-teal-600 hover:bg-teal-700 text-white"
            onClick={handleActivate}
            disabled={loading}
          >
            {loading ? "در حال فعال‌سازی..." : "فعال‌سازی آزمایشی رایگان"}
          </Button>
          <button
            aria-label="بستن"
            onClick={handleDismiss}
            className="text-teal-500 hover:text-teal-700 dark:text-teal-400 dark:hover:text-teal-200 p-1"
          >
            <X className="size-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
