"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Clock, AlertTriangle, XCircle, X } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import type { SubStatus, Role, Plan } from "@/types"

const PLAN_LABELS: Record<"FREE" | "PRO" | "TEAM", string> = {
  FREE: "رایگان",
  PRO:  "حرفه‌ای",
  TEAM: "تیم",
}

interface SubscriptionBannerProps {
  plan: Plan
  isTrial: boolean
  status: SubStatus
  isNearExpiry: boolean
  daysUntilExpiry: number
  graceDaysLeft: number
  role: Role
}

type BannerState = "near_expiry" | "grace" | "locked"

function deriveBannerState(props: SubscriptionBannerProps): BannerState | null {
  if (props.plan === "FREE") return null
  if (props.status === "LOCKED" || props.status === "CANCELLED") return "locked"
  if (props.status === "GRACE") return "grace"
  if (props.isNearExpiry) return "near_expiry"
  return null
}

function getTodayKey() {
  const d = new Date()
  return `sub_banner_dismissed_${d.getFullYear()}_${d.getMonth()}_${d.getDate()}`
}

export function SubscriptionBanner({
  plan,
  isTrial,
  status,
  isNearExpiry,
  daysUntilExpiry,
  graceDaysLeft,
  role,
}: SubscriptionBannerProps) {
  const bannerState = deriveBannerState({ plan, isTrial, status, isNearExpiry, daysUntilExpiry, graceDaysLeft, role })
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    // "locked" banners cannot be dismissed — user must take action
    if (bannerState === "locked") return
    try {
      if (localStorage.getItem(getTodayKey()) === "1") setDismissed(true)
    } catch { /* ignore */ }
  }, [bannerState])

  if (!bannerState) return null
  if (dismissed && bannerState !== "locked") return null

  const isManager = role === "MANAGER"
  const planLabel = PLAN_LABELS[plan]
  const subscriptionLabel = isTrial ? `آزمایشی ${planLabel}` : planLabel
  const daysLeft = Math.max(1, Math.ceil(daysUntilExpiry))
  const daysLeftPersian = daysLeft.toLocaleString("fa-IR")
  const graceDaysPersian = graceDaysLeft.toLocaleString("fa-IR")

  function dismiss() {
    try { localStorage.setItem(getTodayKey(), "1") } catch { /* ignore */ }
    setDismissed(true)
  }

  const DismissButton = () => (
    <button
      onClick={dismiss}
      className="shrink-0 opacity-60 hover:opacity-100 transition-opacity mr-2"
      aria-label="بستن"
    >
      <X className="h-4 w-4" />
    </button>
  )

  if (bannerState === "near_expiry") {
    return (
      <Alert className="rounded-none border-x-0 border-t-0 border-yellow-200 bg-yellow-50 text-yellow-900 [&>svg]:text-yellow-700 dark:border-yellow-800/40 dark:bg-yellow-950/40 dark:text-yellow-300 dark:[&>svg]:text-yellow-400">
        <Clock />
        {isManager && <AlertTitle>همچنان از همه قابلیت‌ها استفاده کنید</AlertTitle>}
        <AlertDescription className="text-yellow-800 dark:text-yellow-400 flex items-center justify-between gap-2">
          <span>
            {isManager ? (
              <>
                {daysLeftPersian} روز از دوره {subscriptionLabel} باقی مانده — برای ادامه دسترسی نامحدود اشتراک خود را تمدید کنید.{" "}
                <Link href="/settings" className="font-medium underline underline-offset-2 hover:no-underline">
                  تمدید اشتراک
                </Link>
              </>
            ) : (
              `اشتراک ${subscriptionLabel} دفتر ${daysLeftPersian} روز دیگر تمام می‌شود. برای تمدید با مدیر خود هماهنگ کنید.`
            )}
          </span>
          <DismissButton />
        </AlertDescription>
      </Alert>
    )
  }

  if (bannerState === "grace") {
    return (
      <Alert className="rounded-none border-x-0 border-t-0 border-amber-200 bg-amber-50 text-amber-900 [&>svg]:text-amber-700 dark:border-amber-800/40 dark:bg-amber-950/40 dark:text-amber-300 dark:[&>svg]:text-amber-400">
        <AlertTriangle />
        {isManager && <AlertTitle>اشتراک منقضی شده</AlertTitle>}
        <AlertDescription className="text-amber-800 dark:text-amber-400 flex items-center justify-between gap-2">
          <span>
            {isManager ? (
              <>
                اشتراک {subscriptionLabel} شما منقضی شده است. {graceDaysPersian} روز تا محدودیت دسترسی باقی است.{" "}
                <Link href="/settings" className="font-medium underline underline-offset-2 hover:no-underline">
                  تمدید اشتراک
                </Link>
              </>
            ) : (
              "اشتراک دفتر منقضی شده. برای ادامه کار با مدیر خود تماس بگیرید."
            )}
          </span>
          <DismissButton />
        </AlertDescription>
      </Alert>
    )
  }

  // locked — cannot be dismissed
  return (
    <Alert variant="destructive" className="rounded-none border-x-0 border-t-0 dark:border-red-800/40 dark:bg-red-950/40">
      <XCircle />
      {isManager && <AlertTitle>حساب قفل شده</AlertTitle>}
      <AlertDescription>
        {isManager ? (
          <>
            دسترسی به دلیل انقضای اشتراک محدود شده است.{" "}
            <Link href="/settings" className="font-medium underline underline-offset-2 hover:no-underline">
              خرید اشتراک
            </Link>
          </>
        ) : (
          "دسترسی به دلیل انقضای اشتراک قفل شده است. برای ادامه کار با مدیر خود تماس بگیرید."
        )}
      </AlertDescription>
    </Alert>
  )
}
