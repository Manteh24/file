import { db } from "@/lib/db"

export const DEFAULT_SETTINGS: Record<string, string> = {
  TRIAL_LENGTH_DAYS: "30",
  MAINTENANCE_MODE: "false",
  ZARINPAL_MODE: "production",
  AVALAI_MODEL: "gpt-4o-mini",
  FREE_MAX_USERS: "1",
  FREE_MAX_FILES: "10",
  FREE_MAX_AI_MONTH: "10",
  FREE_MAX_SMS_MONTH: "30",
  DEFAULT_REFERRAL_COMMISSION: "50000",
  REFERRAL_BONUS_PERCENT: "25",
  REFERRAL_BONUS_MAX_TOMAN: "150000",
  REFERRAL_BONUS_LIFETIME_CAP: "10",
}

// ─── 30-Second In-Process Cache ───────────────────────────────────────────────
// Avoids a DB round-trip on every request. Cleared on every setSetting() call.
// TTL is intentionally short — settings changes propagate within one cache cycle.

interface CacheEntry {
  value: string
  expiresAt: number
}

const settingsCache = new Map<string, CacheEntry>()
const CACHE_TTL_MS = 30_000

function getCached(key: string): string | undefined {
  const entry = settingsCache.get(key)
  if (!entry) return undefined
  if (Date.now() > entry.expiresAt) {
    settingsCache.delete(key)
    return undefined
  }
  return entry.value
}

function setCached(key: string, value: string): void {
  settingsCache.set(key, { value, expiresAt: Date.now() + CACHE_TTL_MS })
}

/** Clears all cached settings — use in tests to avoid cross-test cache pollution. */
export function clearSettingsCache(): void {
  settingsCache.clear()
}

// ─── Core Read / Write ────────────────────────────────────────────────────────

/**
 * Reads a platform setting by key, checking the in-process cache first.
 * Returns the fallback if the record is not found.
 */
export async function getSetting(key: string, fallback: string): Promise<string> {
  const cached = getCached(key)
  if (cached !== undefined) return cached

  const record = await db.platformSetting.findUnique({ where: { key } })
  const value = record?.value ?? fallback
  setCached(key, value)
  return value
}

/**
 * Upserts a platform setting and invalidates the cache for that key.
 */
export async function setSetting(key: string, value: string, adminId: string): Promise<void> {
  await db.platformSetting.upsert({
    where: { key },
    create: { key, value, updatedByAdminId: adminId },
    update: { value, updatedByAdminId: adminId },
  })
  // Invalidate so next read fetches the fresh value
  settingsCache.delete(key)
}

// ─── Typed Getters ────────────────────────────────────────────────────────────

/**
 * Returns the configured trial length in days (default 30).
 */
export async function getTrialLengthDays(): Promise<number> {
  const raw = await getSetting("TRIAL_LENGTH_DAYS", "30")
  const parsed = parseInt(raw, 10)
  return isNaN(parsed) || parsed < 1 ? 30 : parsed
}

/**
 * Returns true when the platform is in maintenance mode.
 * Non-admin routes are redirected to /maintenance while this is active.
 */
export async function isMaintenanceModeEnabled(): Promise<boolean> {
  const raw = await getSetting("MAINTENANCE_MODE", "false")
  return raw === "true"
}

/**
 * Returns the Zarinpal payment mode: "sandbox" | "production".
 */
export async function getZarinpalMode(): Promise<"sandbox" | "production"> {
  const raw = await getSetting("ZARINPAL_MODE", "production")
  return raw === "sandbox" ? "sandbox" : "production"
}

/**
 * Returns the AvalAI model identifier to use for description generation.
 */
export async function getAvalAiModel(): Promise<string> {
  return getSetting("AVALAI_MODEL", "gpt-4o-mini")
}

/**
 * Returns the default referral commission per office per month in Toman (default 50,000).
 * Applied to all auto-generated office codes. Admin-created partner codes are unaffected.
 */
export async function getDefaultReferralCommission(): Promise<number> {
  const raw = await getSetting("DEFAULT_REFERRAL_COMMISSION", "50000")
  const parsed = parseInt(raw, 10)
  return isNaN(parsed) || parsed < 0 ? 50000 : parsed
}

/**
 * Returns the percent of the first verified payment to pay as a referral bonus (default 25).
 * Used in tandem with REFERRAL_BONUS_MAX_TOMAN as the per-payout cap.
 */
export async function getReferralBonusPercent(): Promise<number> {
  const raw = await getSetting("REFERRAL_BONUS_PERCENT", "25")
  const parsed = parseInt(raw, 10)
  if (isNaN(parsed) || parsed < 0) return 25
  if (parsed > 100) return 100
  return parsed
}

/**
 * Returns the per-payout cap in Toman (default 150,000).
 * Bonus = min(floor(payment × percent/100), maxToman).
 */
export async function getReferralBonusMaxToman(): Promise<number> {
  const raw = await getSetting("REFERRAL_BONUS_MAX_TOMAN", "150000")
  const parsed = parseInt(raw, 10)
  return isNaN(parsed) || parsed < 0 ? 150000 : parsed
}

/**
 * Returns the lifetime cap on number of bonus payouts per referrer code (default 10).
 * Once reached, the code still tracks signups but no new bonuses accrue.
 */
export async function getReferralBonusLifetimeCap(): Promise<number> {
  const raw = await getSetting("REFERRAL_BONUS_LIFETIME_CAP", "10")
  const parsed = parseInt(raw, 10)
  return isNaN(parsed) || parsed < 0 ? 10 : parsed
}

/**
 * Returns the runtime-configurable limits for the FREE plan.
 * Falls back to defaults (1 user, 10 files, 10 AI/month, 30 SMS/month) if settings are missing.
 */
export async function getFreePlanLimits(): Promise<{
  maxUsers: number
  maxActiveFiles: number
  maxAiPerMonth: number
  maxSmsPerMonth: number
}> {
  const [usersRaw, filesRaw, aiRaw, smsRaw] = await Promise.all([
    getSetting("FREE_MAX_USERS", "1"),
    getSetting("FREE_MAX_FILES", "10"),
    getSetting("FREE_MAX_AI_MONTH", "10"),
    getSetting("FREE_MAX_SMS_MONTH", "30"),
  ])

  const parsePositiveInt = (raw: string, fallback: number): number => {
    const n = parseInt(raw, 10)
    return isNaN(n) || n < 0 ? fallback : n
  }

  return {
    maxUsers: parsePositiveInt(usersRaw, 1),
    maxActiveFiles: parsePositiveInt(filesRaw, 10),
    maxAiPerMonth: parsePositiveInt(aiRaw, 10),
    maxSmsPerMonth: parsePositiveInt(smsRaw, 30),
  }
}
