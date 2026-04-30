"use client"

import Link from "next/link"
import { Lock, Check, type LucideIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { PLAN_LABELS, PLAN_PRICES_TOMAN } from "@/lib/plan-constants"
import { formatToman } from "@/lib/utils"
import type { PLAN_FEATURES } from "@/lib/plan-constants-client"

interface PlanLockCardProps {
  feature: keyof typeof PLAN_FEATURES.PRO
  requiredPlan: "PRO" | "TEAM"
  title: string
  bullets: string[]
  icon?: LucideIcon
  className?: string
}

export function PlanLockCard({
  requiredPlan,
  title,
  bullets,
  icon: Icon = Lock,
  className,
}: PlanLockCardProps) {
  const planLabel = PLAN_LABELS[requiredPlan]
  const monthlyPrice = formatToman(PLAN_PRICES_TOMAN[requiredPlan].MONTHLY)

  return (
    <div
      className={`rounded-xl border bg-card p-6 text-center ${className ?? ""}`}
    >
      <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-[var(--color-teal-500)]/10 text-[var(--color-teal-600)] dark:bg-[var(--color-teal-500)]/15 dark:text-[var(--color-teal-400)]">
        <Icon className="size-5" />
      </div>

      <h3 className="text-base font-semibold text-foreground">
        {title} — فقط در پلن {planLabel}
      </h3>
      <p className="mt-1.5 text-sm text-muted-foreground">
        {monthlyPrice} در ماه
      </p>

      <ul className="mx-auto mt-5 max-w-sm space-y-2 text-start">
        {bullets.map((b) => (
          <li
            key={b}
            className="flex items-start gap-2 text-sm text-muted-foreground"
          >
            <Check className="mt-0.5 size-4 shrink-0 text-[var(--color-teal-600)] dark:text-[var(--color-teal-400)]" />
            <span>{b}</span>
          </li>
        ))}
      </ul>

      <div className="mt-6 flex flex-col items-center gap-2">
        <Button asChild size="sm">
          <Link href="/settings#billing">ارتقا به پلن {planLabel}</Link>
        </Button>
        <Link
          href="/pricing"
          className="text-xs text-muted-foreground underline-offset-2 hover:underline"
        >
          مقایسه پلن‌ها
        </Link>
      </div>
    </div>
  )
}
