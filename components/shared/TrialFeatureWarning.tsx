"use client"
import { useState, useEffect } from "react"
import Link from "next/link"
import { AlertTriangle, X } from "lucide-react"
import { PLAN_FEATURES } from "@/lib/plan-constants-client"

interface Props {
  feature: keyof typeof PLAN_FEATURES.PRO
  subscription: { isTrial: boolean; trialEndsAt: Date | string | null }
}

export function TrialFeatureWarning({ feature, subscription }: Props) {
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    try {
      if (localStorage.getItem(`trial_warn_dismissed_${feature}`) === "1") setDismissed(true)
    } catch { /* ignore */ }
  }, [feature])

  if (!subscription.isTrial) return null
  if (!PLAN_FEATURES.PRO[feature]) return null
  if (dismissed) return null

  const trialEnd = subscription.trialEndsAt ? new Date(subscription.trialEndsAt) : null
  const daysLeft = trialEnd
    ? Math.ceil((trialEnd.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null

  const isUrgent = daysLeft !== null && daysLeft <= 7
  const colorClass = isUrgent
    ? "bg-red-50 border-red-200 text-red-700"
    : "bg-amber-50 border-amber-200 text-amber-700"
  const iconClass = isUrgent ? "text-red-500" : "text-amber-500"

  function dismiss() {
    try { localStorage.setItem(`trial_warn_dismissed_${feature}`, "1") } catch { /* ignore */ }
    setDismissed(true)
  }

  return (
    <div className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm ${colorClass}`}>
      <AlertTriangle className={`h-4 w-4 shrink-0 ${iconClass}`} />
      <span className="flex-1">این امکان فقط در نسخه پرو — با پایان آزمایشی قطع می‌شود</span>
      <Link href="/settings#billing" className="font-medium underline underline-offset-2 mr-1 shrink-0">
        ادامه با پرو
      </Link>
      <button
        onClick={dismiss}
        className="shrink-0 opacity-60 hover:opacity-100 transition-opacity"
        aria-label="بستن"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}
