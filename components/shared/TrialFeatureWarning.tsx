"use client"
import Link from "next/link"
import { AlertTriangle } from "lucide-react"
import { PLAN_FEATURES } from "@/lib/plan-constants-client"

interface Props {
  feature: keyof typeof PLAN_FEATURES.PRO
  subscription: { isTrial: boolean; trialEndsAt: Date | string | null }
}

export function TrialFeatureWarning({ feature, subscription }: Props) {
  if (!subscription.isTrial) return null
  if (!PLAN_FEATURES.PRO[feature]) return null

  const trialEnd = subscription.trialEndsAt ? new Date(subscription.trialEndsAt) : null
  const daysLeft = trialEnd
    ? Math.ceil((trialEnd.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null

  const isUrgent = daysLeft !== null && daysLeft <= 7
  const colorClass = isUrgent
    ? "bg-red-50 border-red-200 text-red-700"
    : "bg-amber-50 border-amber-200 text-amber-700"
  const iconClass = isUrgent ? "text-red-500" : "text-amber-500"

  return (
    <div className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm ${colorClass}`}>
      <AlertTriangle className={`h-4 w-4 shrink-0 ${iconClass}`} />
      <span>این امکان فقط در نسخه پرو — با پایان آزمایشی قطع می‌شود</span>
      <Link href="/settings#billing" className="font-medium underline underline-offset-2 mr-1">
        ادامه با پرو
      </Link>
    </div>
  )
}
