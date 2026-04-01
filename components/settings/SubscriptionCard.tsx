"use client"

import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { formatToman, formatJalali } from "@/lib/utils"
import { PLAN_PRICES_TOMAN, PLAN_LABELS } from "@/lib/plan-constants"
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

const PLAN_FEATURES = {
  PRO: ["تا ۷ مشاور", "فایل نامحدود", "پیامک و نقشه", "گزارش‌های مالی"],
  TEAM: ["مشاور نامحدود", "همه امکانات حرفه‌ای", "آنالیز پیشرفته", "چند شعبه (به زودی)"],
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
  const expiryDate = isTrial ? trialEndsAt : currentPeriodEnd

  return (
    <div className="space-y-5">
      {/* Current plan info card */}
      <div className="rounded-md bg-muted/40 border border-border px-4 py-3 flex justify-between items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium text-foreground">
            پلن {PLAN_LABELS[plan]}
          </span>
          <Badge variant={statusBadge.variant}>{statusBadge.label}</Badge>
          {isTrial && <Badge variant="outline">آزمایشی</Badge>}
        </div>
        <div className="text-sm text-muted-foreground">
          {plan === "FREE" && !isTrial ? (
            <span className="text-emerald-600 font-medium">رایگان — بدون انقضا</span>
          ) : expiryDate ? (
            <span>
              {isTrial ? "پایان آزمایشی" : "پایان اشتراک"}:{" "}
              <span className="font-medium text-foreground">
                {formatJalali(new Date(expiryDate))}
              </span>
            </span>
          ) : null}
        </div>
      </div>

      {/* Billing cycle toggle — underline tab style */}
      <div className="flex gap-6 border-b border-border">
        <button
          onClick={() => setBillingCycle("MONTHLY")}
          className={`pb-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
            billingCycle === "MONTHLY"
              ? "border-primary text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          ماهانه
        </button>
        <button
          onClick={() => setBillingCycle("ANNUAL")}
          className={`pb-2.5 text-sm font-medium transition-colors border-b-2 -mb-px flex items-center gap-1.5 ${
            billingCycle === "ANNUAL"
              ? "border-primary text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          سالانه
          <span className="text-xs text-emerald-600 font-normal">۲ ماه رایگان</span>
        </button>
      </div>

      {/* Plan cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {/* PRO plan */}
        <div className={`bg-card border rounded-md p-5 space-y-4 ${
          isActivePro ? "border-primary/50 bg-primary/5" : "border-border"
        }`}>
          <div>
            <p className="font-semibold text-foreground">{PLAN_LABELS.PRO}</p>
            <p className="text-sm text-muted-foreground mt-0.5">
              {formatToman(PLAN_PRICES_TOMAN.PRO[billingCycle])}
              {billingCycle === "MONTHLY" ? " / ماه" : " / سال"}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              کمتر از کارمزد یک اجاره‌نامه در ماه
            </p>
          </div>
          <ul className="text-sm text-muted-foreground space-y-1.5">
            {PLAN_FEATURES.PRO.map((f) => (
              <li key={f} className="flex items-center gap-2">
                <span className="text-primary font-medium">✓</span>
                {f}
              </li>
            ))}
          </ul>
          <Button
            variant={isActivePro ? "outline" : "default"}
            className="w-full h-11 rounded-md"
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
        <div className={`bg-card border rounded-md p-5 space-y-4 ${
          isActiveTeam ? "border-primary/50 bg-primary/5" : "border-primary/30 bg-primary/5"
        }`}>
          <div>
            <p className="font-semibold text-foreground">{PLAN_LABELS.TEAM}</p>
            <p className="text-sm text-muted-foreground mt-0.5">
              {formatToman(PLAN_PRICES_TOMAN.TEAM[billingCycle])}
              {billingCycle === "MONTHLY" ? " / ماه" : " / سال"}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              کمتر از حقوق یک منشی
            </p>
          </div>
          <ul className="text-sm text-muted-foreground space-y-1.5">
            {PLAN_FEATURES.TEAM.map((f) => (
              <li key={f} className="flex items-center gap-2">
                <span className="text-primary font-medium">✓</span>
                {f}
              </li>
            ))}
          </ul>
          <Button
            variant={isActiveTeam ? "outline" : "default"}
            className="w-full h-11 rounded-md"
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

      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}
    </div>
  )
}
