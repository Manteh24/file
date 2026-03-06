import { db } from "@/lib/db"

export const DEFAULT_SETTINGS: Record<string, string> = {
  TRIAL_LENGTH_DAYS: "30",
}

/**
 * Reads a platform setting by key.
 * Returns the fallback if the record is not found.
 */
export async function getSetting(key: string, fallback: string): Promise<string> {
  const record = await db.platformSetting.findUnique({ where: { key } })
  return record?.value ?? fallback
}

/**
 * Upserts a platform setting. Logs the admin who changed it.
 */
export async function setSetting(key: string, value: string, adminId: string): Promise<void> {
  await db.platformSetting.upsert({
    where: { key },
    create: { key, value, updatedByAdminId: adminId },
    update: { value, updatedByAdminId: adminId },
  })
}

/**
 * Returns the configured trial length in days (default 30).
 */
export async function getTrialLengthDays(): Promise<number> {
  const raw = await getSetting("TRIAL_LENGTH_DAYS", "30")
  const parsed = parseInt(raw, 10)
  return isNaN(parsed) || parsed < 1 ? 30 : parsed
}
