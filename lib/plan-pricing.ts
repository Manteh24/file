import type { BillingCycle } from "@/types"
import { getSetting } from "@/lib/platform-settings"
import { PLAN_PRICES_TOMAN as DEFAULT_PRICES_TOMAN } from "@/lib/plan-constants"

export const PLAN_PRICE_SETTING_KEYS = {
  PRO_MONTHLY:  "PLAN_PRICE_PRO_MONTHLY",
  PRO_ANNUAL:   "PLAN_PRICE_PRO_ANNUAL",
  TEAM_MONTHLY: "PLAN_PRICE_TEAM_MONTHLY",
  TEAM_ANNUAL:  "PLAN_PRICE_TEAM_ANNUAL",
} as const

export type PlanPriceMatrix = Record<"PRO" | "TEAM", Record<BillingCycle, number>>

const TOMAN_TO_RIAL = 10

function parseToman(raw: string, fallback: number): number {
  const n = parseInt(raw, 10)
  return isNaN(n) || n < 0 ? fallback : n
}

/**
 * Reads the four plan prices (Toman) from PlatformSetting, falling back to
 * DEFAULT_PRICES_TOMAN. Reuses the 30s cache in lib/platform-settings.ts.
 * Returns both Toman and Rial matrices — the second is just × 10.
 */
export async function getEffectivePlanPrices(): Promise<{
  toman: PlanPriceMatrix
  rials: PlanPriceMatrix
}> {
  const [proM, proA, teamM, teamA] = await Promise.all([
    getSetting(PLAN_PRICE_SETTING_KEYS.PRO_MONTHLY,  String(DEFAULT_PRICES_TOMAN.PRO.MONTHLY)),
    getSetting(PLAN_PRICE_SETTING_KEYS.PRO_ANNUAL,   String(DEFAULT_PRICES_TOMAN.PRO.ANNUAL)),
    getSetting(PLAN_PRICE_SETTING_KEYS.TEAM_MONTHLY, String(DEFAULT_PRICES_TOMAN.TEAM.MONTHLY)),
    getSetting(PLAN_PRICE_SETTING_KEYS.TEAM_ANNUAL,  String(DEFAULT_PRICES_TOMAN.TEAM.ANNUAL)),
  ])

  const toman: PlanPriceMatrix = {
    PRO: {
      MONTHLY: parseToman(proM, DEFAULT_PRICES_TOMAN.PRO.MONTHLY),
      ANNUAL:  parseToman(proA, DEFAULT_PRICES_TOMAN.PRO.ANNUAL),
    },
    TEAM: {
      MONTHLY: parseToman(teamM, DEFAULT_PRICES_TOMAN.TEAM.MONTHLY),
      ANNUAL:  parseToman(teamA, DEFAULT_PRICES_TOMAN.TEAM.ANNUAL),
    },
  }
  const rials: PlanPriceMatrix = {
    PRO: {
      MONTHLY: toman.PRO.MONTHLY  * TOMAN_TO_RIAL,
      ANNUAL:  toman.PRO.ANNUAL   * TOMAN_TO_RIAL,
    },
    TEAM: {
      MONTHLY: toman.TEAM.MONTHLY * TOMAN_TO_RIAL,
      ANNUAL:  toman.TEAM.ANNUAL  * TOMAN_TO_RIAL,
    },
  }
  return { toman, rials }
}
