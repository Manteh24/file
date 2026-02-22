"use client"

import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { formatToman, formatJalali } from "@/lib/utils"
import { PLAN_PRICES_TOMAN, PLAN_LABELS } from "@/lib/payment"
import type { SubscriptionInfo } from "@/types"

interface SubscriptionCardProps {
  subscription: SubscriptionInfo | null
}

const STATUS_BADGE: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  ACTIVE: { label: "فعال", variant: "default" },
  GRACE: { label: "دوره اضافه", variant: "secondary" },
  LOCKED: { label: "محدودشده", variant: "destructive" },
  CANCELLED: { label: "لغوشده", variant: "outline" },
}

export function SubscriptionCard({ subscription }: SubscriptionCardProps) {
  const [loadingPlan, setLoadingPlan] = useState<"SMALL" | "LARGE" | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleUpgrade(plan: "SMALL" | "LARGE") {
    setLoadingPlan(plan)
    setError(null)

    const res = await fetch("/api/payments/request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plan }),
    })

    const data: { success: boolean; data?: { payUrl: string }; error?: string } =
      await res.json()

    if (!data.success || !data.data) {
      setError(data.error ?? "خطا در اتصال به درگاه پرداخت")
      setLoadingPlan(null)
      return
    }

    // Redirect to Zarinpal — replaces current page so back button returns to settings
    window.location.href = data.data.payUrl
  }

  if (!subscription) {
    return (
      <p className="text-sm text-muted-foreground">اطلاعات اشتراک در دسترس نیست.</p>
    )
  }

  const { plan, status, trialEndsAt, currentPeriodEnd } = subscription
  const statusBadge = STATUS_BADGE[status] ?? STATUS_BADGE.ACTIVE
  const isTrial = plan === "TRIAL"
  const isSmall = plan === "SMALL"
  const isActive = status === "ACTIVE"

  return (
    <div className="space-y-5">
      {/* Current plan summary */}
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-lg font-semibold">
          پلن {PLAN_LABELS[plan]}
        </span>
        <Badge variant={statusBadge.variant}>{statusBadge.label}</Badge>
      </div>

      {/* Date information */}
      <div className="text-sm text-muted-foreground space-y-1">
        {isTrial && (
          <p>
            پایان دوره آزمایشی:{" "}
            <span className="font-medium text-foreground">
              {formatJalali(new Date(trialEndsAt))}
            </span>
          </p>
        )}
        {!isTrial && currentPeriodEnd && (
          <p>
            پایان اشتراک:{" "}
            <span className="font-medium text-foreground">
              {formatJalali(new Date(currentPeriodEnd))}
            </span>
          </p>
        )}
      </div>

      <Separator />

      {/* Plan cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {/* SMALL plan */}
        <div className="rounded-lg border p-4 space-y-3">
          <div>
            <p className="font-semibold">{PLAN_LABELS.SMALL}</p>
            <p className="text-sm text-muted-foreground">
              {formatToman(PLAN_PRICES_TOMAN.SMALL)} / ماه
            </p>
          </div>
          <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
            <li>مدیریت کامل فایل‌ها</li>
            <li>تا ۳ مشاور</li>
            <li>اشتراک‌گذاری لینک</li>
          </ul>
          {(isTrial || isSmall || status !== "ACTIVE") && (
            <Button
              size="sm"
              variant={isSmall && isActive ? "outline" : "default"}
              className="w-full"
              disabled={loadingPlan !== null}
              onClick={() => handleUpgrade("SMALL")}
            >
              {loadingPlan === "SMALL"
                ? "در حال انتقال..."
                : isSmall && isActive
                  ? "تمدید پلن پایه"
                  : "ارتقا به پلن پایه"}
            </Button>
          )}
        </div>

        {/* LARGE plan */}
        <div className="rounded-lg border p-4 space-y-3">
          <div>
            <p className="font-semibold">{PLAN_LABELS.LARGE}</p>
            <p className="text-sm text-muted-foreground">
              {formatToman(PLAN_PRICES_TOMAN.LARGE)} / ماه
            </p>
          </div>
          <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
            <li>همه امکانات پلن پایه</li>
            <li>مشاور نامحدود</li>
            <li>گزارش‌های پیشرفته</li>
          </ul>
          <Button
            size="sm"
            variant={!isSmall && !isTrial && isActive ? "outline" : "default"}
            className="w-full"
            disabled={loadingPlan !== null}
            onClick={() => handleUpgrade("LARGE")}
          >
            {loadingPlan === "LARGE"
              ? "در حال انتقال..."
              : !isSmall && !isTrial && isActive
                ? "تمدید پلن حرفه‌ای"
                : "ارتقا به پلن حرفه‌ای"}
          </Button>
        </div>
      </div>

      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}
    </div>
  )
}
