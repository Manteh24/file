"use client"

import Link from "next/link"
import { Clock, AlertTriangle, XCircle } from "lucide-react"
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
  if (!bannerState) return null

  const isManager = role === "MANAGER"
  const planLabel = PLAN_LABELS[plan]
  const subscriptionLabel = isTrial ? `آزمایشی ${planLabel}` : planLabel
  const daysLeft = Math.max(1, Math.ceil(daysUntilExpiry))
  const daysLeftPersian = daysLeft.toLocaleString("fa-IR")
  const graceDaysPersian = graceDaysLeft.toLocaleString("fa-IR")

  if (bannerState === "near_expiry") {
    return (
      <Alert className="rounded-none border-x-0 border-t-0 border-yellow-200 bg-yellow-50 text-yellow-900 [&>svg]:text-yellow-700">
        <Clock />
        {isManager && <AlertTitle>اشتراک در حال انقضا</AlertTitle>}
        <AlertDescription className="text-yellow-800">
          {isManager ? (
            <>
              {subscriptionLabel} شما {daysLeftPersian} روز دیگر به پایان می‌رسد.{" "}
              <Link href="/settings" className="font-medium underline underline-offset-2 hover:no-underline">
                تمدید اشتراک
              </Link>
            </>
          ) : (
            `اشتراک ${subscriptionLabel} دفتر در ${daysLeftPersian} روز دیگر منقضی می‌شود. با مدیر خود تماس بگیرید.`
          )}
        </AlertDescription>
      </Alert>
    )
  }

  if (bannerState === "grace") {
    return (
      <Alert className="rounded-none border-x-0 border-t-0 border-amber-200 bg-amber-50 text-amber-900 [&>svg]:text-amber-700">
        <AlertTriangle />
        {isManager && <AlertTitle>اشتراک منقضی شده</AlertTitle>}
        <AlertDescription className="text-amber-800">
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
        </AlertDescription>
      </Alert>
    )
  }

  // locked
  return (
    <Alert variant="destructive" className="rounded-none border-x-0 border-t-0">
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
