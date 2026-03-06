import { db } from "@/lib/db"

export const DEFAULT_SETTINGS: Record<string, string> = {
  TRIAL_LENGTH_DAYS: "30",
  MAINTENANCE_MODE: "false",
  ZARINPAL_MODE: "production",
  AVALAI_MODEL: "gpt-4o-mini",
  FREE_MAX_USERS: "1",
  FREE_MAX_FILES: "10",
  FREE_MAX_AI_MONTH: "10",
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
 * Returns the runtime-configurable limits for the FREE plan.
 * Falls back to defaults (1 user, 10 files, 10 AI/month) if settings are missing.
 */
export async function getFreePlanLimits(): Promise<{
  maxUsers: number
  maxActiveFiles: number
  maxAiPerMonth: number
}> {
  const [usersRaw, filesRaw, aiRaw] = await Promise.all([
    getSetting("FREE_MAX_USERS", "1"),
    getSetting("FREE_MAX_FILES", "10"),
    getSetting("FREE_MAX_AI_MONTH", "10"),
  ])

  const parsePositiveInt = (raw: string, fallback: number): number => {
    const n = parseInt(raw, 10)
    return isNaN(n) || n < 0 ? fallback : n
  }

  return {
    maxUsers: parsePositiveInt(usersRaw, 1),
    maxActiveFiles: parsePositiveInt(filesRaw, 10),
    maxAiPerMonth: parsePositiveInt(aiRaw, 10),
  }
}
