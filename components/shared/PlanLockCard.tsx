"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Lock, Check, X, type LucideIcon } from "lucide-react"
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
  /** When true with a dismissKey, the card shows an X and persists the
      dismissal in localStorage so it never re-appears for this user. */
  dismissible?: boolean
  dismissKey?: string
}

export function PlanLockCard({
  requiredPlan,
  title,
  bullets,
  icon: Icon = Lock,
  className,
  dismissible,
  dismissKey,
}: PlanLockCardProps) {
  const planLabel = PLAN_LABELS[requiredPlan]
  const monthlyPrice = formatToman(PLAN_PRICES_TOMAN[requiredPlan].MONTHLY)

  // Persist dismissal forever per user (localStorage). Hydration-safe: start
  // visible, hide on mount if the key is set so SSR + first paint match.
  const storageKey = dismissible && dismissKey ? `plan-lock-dismissed:${dismissKey}` : null
  const [dismissed, setDismissed] = useState(false)
  useEffect(() => {
    if (storageKey && localStorage.getItem(storageKey) === "1") {
      setDismissed(true)
    }
  }, [storageKey])

  if (dismissed) return null

  function handleDismiss() {
    if (storageKey) localStorage.setItem(storageKey, "1")
    setDismissed(true)
  }

  return (
    <div
      className={`relative rounded-xl border bg-card p-6 text-center ${className ?? ""}`}
    >
      {dismissible && dismissKey && (
        <button
          type="button"
          onClick={handleDismiss}
          aria-label="بستن"
          className="absolute top-2 end-2 rounded p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <X className="size-4" />
        </button>
      )}
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
