import type { BillingCycle } from "@/types"

export const PLAN_PRICES_TOMAN: Record<"PRO" | "TEAM", Record<BillingCycle, number>> = {
  PRO:  { MONTHLY: 290_000, ANNUAL: 2_900_000 },
  TEAM: { MONTHLY: 590_000, ANNUAL: 5_900_000 },
}

export const PLAN_PRICES_RIALS: Record<"PRO" | "TEAM", Record<BillingCycle, number>> = {
  PRO:  { MONTHLY: 2_900_000, ANNUAL: 29_000_000 },
  TEAM: { MONTHLY: 5_900_000, ANNUAL: 59_000_000 },
}

export const PLAN_LABELS: Record<"FREE" | "PRO" | "TEAM", string> = {
  FREE: "رایگان",
  PRO:  "حرفه‌ای",
  TEAM: "تیم",
}
