"use client"

import { useState } from "react"
import Link from "next/link"
import { Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { formatToman } from "@/lib/utils"
import { PLAN_PRICES_TOMAN } from "@/lib/plan-constants"
import type { PlanPriceMatrix } from "@/lib/plan-pricing"
import type { BillingCycle } from "@/types"

interface PlanCardProps {
  name: string
  price: number | null
  billingCycle: BillingCycle
  tagline: string | null
  features: string[]
  cta: string
  ctaHref: string
  highlighted?: boolean
  badge?: string
}

function PlanCard({
  name,
  price,
  billingCycle,
  tagline,
  features,
  cta,
  ctaHref,
  highlighted,
  badge,
}: PlanCardProps) {
  return (
    <div
      className={`relative rounded-2xl border p-6 flex flex-col gap-5 ${
        highlighted
          ? "border-primary bg-primary/5 shadow-lg"
          : "border-border bg-card"
      }`}
    >
      {badge && (
        <span className="absolute -top-3 right-1/2 translate-x-1/2 rounded-full bg-primary px-3 py-0.5 text-xs font-semibold text-primary-foreground">
          {badge}
        </span>
      )}

      <div className="space-y-1">
        <h2 className="text-lg font-bold">{name}</h2>
        {price === null ? (
          <p className="text-3xl font-bold">رایگان</p>
        ) : (
          <div>
            <p className="text-3xl font-bold">
              {formatToman(price)}
              <span className="text-base font-normal text-muted-foreground">
                {billingCycle === "MONTHLY" ? " / ماه" : " / سال"}
              </span>
            </p>
            {tagline && (
              <p className="text-xs text-muted-foreground mt-1">{tagline}</p>
            )}
          </div>
        )}
      </div>

      <ul className="space-y-2 flex-1">
        {features.map((f) => (
          <li key={f} className="flex items-start gap-2 text-sm">
            <Check className="h-4 w-4 shrink-0 text-green-600 mt-0.5" />
            {f}
          </li>
        ))}
      </ul>

      <Button
        asChild
        variant={highlighted ? "default" : "outline"}
        className="w-full"
      >
        <Link href={ctaHref}>{cta}</Link>
      </Button>
    </div>
  )
}

interface PricingCardsProps {
  prices?: PlanPriceMatrix
}

export function PricingCards({ prices = PLAN_PRICES_TOMAN }: PricingCardsProps = {}) {
  const [billingCycle, setBillingCycle] = useState<BillingCycle>("MONTHLY")

  return (
    <div className="space-y-8">
      {/* Billing cycle toggle */}
      <div className="flex justify-center">
        <div className="flex items-center gap-1 rounded-lg border border-border bg-muted/30 p-1">
          <button
            onClick={() => setBillingCycle("MONTHLY")}
            className={`rounded-md px-5 py-2 text-sm font-medium transition-colors ${
              billingCycle === "MONTHLY"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            ماهانه
          </button>
          <button
            onClick={() => setBillingCycle("ANNUAL")}
            className={`rounded-md px-5 py-2 text-sm font-medium transition-colors ${
              billingCycle === "ANNUAL"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            سالانه
            <span className="mr-1.5 text-xs text-green-600 font-semibold">۲ ماه رایگان</span>
          </button>
        </div>
      </div>

      {/* Plan cards — Free | Pro (highlighted) | Team — RTL so visually: Team | Pro | Free */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
        {/* FREE */}
        <PlanCard
          name="رایگان"
          price={null}
          billingCycle={billingCycle}
          tagline={null}
          features={[
            "۱ کاربر",
            "تا ۱۰ فایل فعال",
            "تا ۱۰ توضیحات هوشمند در ماه",
            "اشتراک‌گذاری لینک",
          ]}
          cta="شروع رایگان"
          ctaHref="/register?plan=free"
        />

        {/* PRO — highlighted */}
        <PlanCard
          name="حرفه‌ای"
          price={prices.PRO[billingCycle]}
          billingCycle={billingCycle}
          tagline={null}
          features={[
            "تا ۷ مشاور",
            "فایل نامحدود",
            "توضیحات هوشمند نامحدود",
            "پیامک و نقشه",
            "گزارش‌های مالی",
            "پشتیبانی اولویت‌دار",
          ]}
          cta="انتخاب پلن حرفه‌ای"
          ctaHref={`/register?plan=pro&intent=pro_trial`}
          highlighted
          badge="محبوب‌ترین"
        />

        {/* TEAM */}
        <PlanCard
          name="تیم"
          price={prices.TEAM[billingCycle]}
          billingCycle={billingCycle}
          tagline={null}
          features={[
            "مشاور نامحدود",
            "فایل نامحدود",
            "توضیحات هوشمند نامحدود",
            "پیامک و نقشه",
            "گزارش‌های مالی",
            "آنالیز پیشرفته",
            "چند شعبه (به زودی)",
          ]}
          cta="انتخاب پلن تیم"
          ctaHref={`/register?plan=team`}
        />
      </div>

      <p className="text-center text-xs text-muted-foreground">
        پلن حرفه‌ای با ۳۰ روز آزمایش رایگان پس از ثبت‌نام — هر زمان قابل ارتقا
      </p>
    </div>
  )
}
