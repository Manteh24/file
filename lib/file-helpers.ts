import { db } from "@/lib/db"
import type { UpdateFileInput } from "@/lib/validations/file"
import type { PropertyFile } from "@/app/generated/prisma/client"

// ─── Activity Log ──────────────────────────────────────────────────────────────

// JSON-safe diff type — values are always [oldValue, newValue] pairs of scalars.
export type FieldDiff = Record<string, (string | number | boolean | null)[]>

export async function logActivity(
  fileId: string,
  userId: string,
  action: string,
  diff?: FieldDiff
) {
  await db.activityLog.create({
    data: {
      fileId,
      userId,
      action,
      // Omit diff when undefined so Prisma leaves the nullable JSON column as NULL
      ...(diff !== undefined && { diff }),
    },
  })
}

// ─── Price History ─────────────────────────────────────────────────────────────

type PriceField = "salePrice" | "depositAmount" | "rentAmount"
const PRICE_FIELDS: PriceField[] = ["salePrice", "depositAmount", "rentAmount"]

/**
 * Compares old and new price values and records a PriceHistory entry
 * for each field that changed.
 */
export async function recordPriceChanges(
  fileId: string,
  changedById: string,
  oldFile: Pick<PropertyFile, "salePrice" | "depositAmount" | "rentAmount">,
  updates: UpdateFileInput
) {
  for (const field of PRICE_FIELDS) {
    const newValue = updates[field]
    if (newValue === undefined) continue

    const oldValue = oldFile[field]
    if (oldValue === newValue) continue

    await db.priceHistory.create({
      data: {
        fileId,
        changedById,
        priceField: field,
        oldPrice: oldValue ?? null,
        newPrice: newValue,
      },
    })
  }
}

// ─── Field Diff ────────────────────────────────────────────────────────────────

/**
 * Builds a field-level diff object between the existing file and the incoming
 * update payload. Returns only fields that actually changed.
 */
export function buildDiff(
  oldFile: PropertyFile,
  updates: UpdateFileInput
): FieldDiff {
  const diff: FieldDiff = {}

  for (const key of Object.keys(updates)) {
    if (key === "contacts") continue
    const field = key as string
    const newVal = (updates as Record<string, unknown>)[field]
    const oldVal = (oldFile as Record<string, unknown>)[field]
    if (newVal !== undefined && newVal !== oldVal) {
      diff[field] = [
        oldVal as string | number | boolean | null,
        newVal as string | number | boolean | null,
      ]
    }
  }

  return diff
}

// ─── Share Link Deactivation ───────────────────────────────────────────────────

/**
 * Deactivates all active share links for a file.
 * Called when a file status changes to anything other than ACTIVE.
 */
export async function deactivateShareLinks(fileId: string) {
  await db.shareLink.updateMany({
    where: { fileId, isActive: true },
    data: { isActive: false },
  })
}
