"use client"

import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { formatToman, formatJalali } from "@/lib/utils"
import { PLAN_PRICES_TOMAN, PLAN_LABELS } from "@/lib/payment"
import type { SubscriptionInfo, BillingCycle } from "@/types"

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
  const [billingCycle, setBillingCycle] = useState<BillingCycle>("MONTHLY")
  const [loadingPlan, setLoadingPlan] = useState<"PRO" | "TEAM" | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleUpgrade(plan: "PRO" | "TEAM") {
    setLoadingPlan(plan)
    setError(null)

    const res = await fetch("/api/payments/request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plan, billingCycle }),
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

  const { plan, status, isTrial, trialEndsAt, currentPeriodEnd } = subscription
  const statusBadge = STATUS_BADGE[status] ?? STATUS_BADGE.ACTIVE
  const isActivePro = plan === "PRO" && status === "ACTIVE" && !isTrial
  const isActiveTeam = plan === "TEAM" && status === "ACTIVE" && !isTrial

  return (
    <div className="space-y-5">
      {/* Current plan summary */}
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-lg font-semibold">
          پلن {PLAN_LABELS[plan]}
        </span>
        <Badge variant={statusBadge.variant}>{statusBadge.label}</Badge>
        {isTrial && <Badge variant="outline">آزمایشی</Badge>}
      </div>

      {/* Date information */}
      <div className="text-sm text-muted-foreground space-y-1">
        {isTrial && trialEndsAt && (
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
        {plan === "FREE" && (
          <p className="text-green-600 font-medium">پلن رایگان — بدون تاریخ انقضا</p>
        )}
      </div>

      {/* Only show upgrade options if not on free */}
      {plan !== "FREE" || status !== "ACTIVE" ? (
        <>
          <Separator />

          {/* Billing cycle toggle */}
          <div className="flex items-center gap-1 rounded-lg border border-border bg-muted/30 p-1 w-fit">
            <button
              onClick={() => setBillingCycle("MONTHLY")}
              className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
                billingCycle === "MONTHLY"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              ماهانه
            </button>
            <button
              onClick={() => setBillingCycle("ANNUAL")}
              className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
                billingCycle === "ANNUAL"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              سالانه
              <span className="mr-1.5 text-xs text-green-600">۲ ماه رایگان</span>
            </button>
          </div>

          {/* Plan cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* PRO plan */}
            <div className="rounded-lg border p-4 space-y-3">
              <div>
                <p className="font-semibold">{PLAN_LABELS.PRO}</p>
                <p className="text-sm text-muted-foreground">
                  {formatToman(PLAN_PRICES_TOMAN.PRO[billingCycle])}
                  {billingCycle === "MONTHLY" ? " / ماه" : " / سال"}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  کمتر از کارمزد یک اجاره‌نامه در ماه
                </p>
              </div>
              <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                <li>تا ۷ مشاور</li>
                <li>فایل نامحدود</li>
                <li>پیامک و نقشه</li>
                <li>گزارش‌های مالی</li>
              </ul>
              <Button
                size="sm"
                variant={isActivePro ? "outline" : "default"}
                className="w-full"
                disabled={loadingPlan !== null}
                onClick={() => handleUpgrade("PRO")}
              >
                {loadingPlan === "PRO"
                  ? "در حال انتقال..."
                  : isActivePro
                    ? "تمدید حرفه‌ای"
                    : "ارتقا به حرفه‌ای"}
              </Button>
            </div>

            {/* TEAM plan */}
            <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 space-y-3">
              <div>
                <p className="font-semibold">{PLAN_LABELS.TEAM}</p>
                <p className="text-sm text-muted-foreground">
                  {formatToman(PLAN_PRICES_TOMAN.TEAM[billingCycle])}
                  {billingCycle === "MONTHLY" ? " / ماه" : " / سال"}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  کمتر از حقوق یک منشی
                </p>
              </div>
              <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                <li>مشاور نامحدود</li>
                <li>همه امکانات حرفه‌ای</li>
                <li>آنالیز پیشرفته</li>
                <li>چند شعبه (به زودی)</li>
              </ul>
              <Button
                size="sm"
                variant={isActiveTeam ? "outline" : "default"}
                className="w-full"
                disabled={loadingPlan !== null}
                onClick={() => handleUpgrade("TEAM")}
              >
                {loadingPlan === "TEAM"
                  ? "در حال انتقال..."
                  : isActiveTeam
                    ? "تمدید تیم"
                    : "ارتقا به تیم"}
              </Button>
            </div>
          </div>
        </>
      ) : null}

      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}
    </div>
  )
}
