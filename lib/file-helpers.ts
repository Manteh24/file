import { db } from "@/lib/db"
import type { UpdateFileInput, FileFilters } from "@/lib/validations/file"
import type { Prisma, PropertyFile } from "@/app/generated/prisma/client"

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
    // Normalize BigInt from DB to number for comparison
    const oldNum = oldValue != null ? Number(oldValue) : null
    if (oldNum === newValue) continue

    await db.priceHistory.create({
      data: {
        fileId,
        changedById,
        priceField: field,
        oldPrice: oldValue,
        newPrice: BigInt(newValue),
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
    // Normalize BigInt (price fields from DB) to number for comparison and JSON storage
    const rawOld = (oldFile as Record<string, unknown>)[field]
    const oldVal = typeof rawOld === "bigint" ? Number(rawOld) : rawOld
    if (newVal !== undefined && newVal !== oldVal) {
      diff[field] = [
        oldVal as string | number | boolean | null,
        newVal as string | number | boolean | null,
      ]
    }
  }

  return diff
}

// ─── File Query Builders ───────────────────────────────────────────────────────

/**
 * Builds the Prisma WHERE clause for the file list query.
 * Shared between the server page (direct DB) and the API route to keep filtering consistent.
 */
export function buildFileWhere(
  officeId: string,
  role: string,
  userId: string,
  filters: FileFilters
): Prisma.PropertyFileWhereInput {
  // Collect AND conditions that can't be expressed as simple field spreads
  const andConditions: Prisma.PropertyFileWhereInput[] = []

  // Text search across address and neighborhood (case-insensitive)
  if (filters.search) {
    const searchOr: Prisma.PropertyFileWhereInput[] = [
      { address: { contains: filters.search, mode: "insensitive" } },
      { neighborhood: { contains: filters.search, mode: "insensitive" } },
    ]
    // Guard: Prisma { OR: [] } matches nothing and has undefined behaviour — only push if non-empty
    if (searchOr.length > 0) andConditions.push({ OR: searchOr })
  }

  // Price range — target column depends on transaction type
  if (filters.priceMin != null || filters.priceMax != null) {
    const priceRange: { gte?: bigint; lte?: bigint } = {}
    if (filters.priceMin != null) priceRange.gte = BigInt(filters.priceMin)
    if (filters.priceMax != null) priceRange.lte = BigInt(filters.priceMax)

    if (filters.transactionType === "SALE" || filters.transactionType === "PRE_SALE") {
      andConditions.push({ salePrice: priceRange })
    } else if (filters.transactionType === "LONG_TERM_RENT") {
      andConditions.push({ depositAmount: priceRange })
    } else if (filters.transactionType === "SHORT_TERM_RENT") {
      andConditions.push({ rentAmount: priceRange })
    } else {
      // No transactionType selected: OR across salePrice and rentAmount so the filter still
      // narrows results regardless of listing type. Intentional — in the Tehran market sale
      // prices (hundreds of millions of Toman) and monthly rents (single-digit millions) differ
      // by orders of magnitude, so a price-range query will not produce meaningful false matches
      // across the two columns.
      const priceOr: Prisma.PropertyFileWhereInput[] = [
        { salePrice: priceRange },
        { rentAmount: priceRange },
      ]
      // Guard: Prisma { OR: [] } matches nothing and has undefined behaviour — only push if non-empty
      if (priceOr.length > 0) andConditions.push({ OR: priceOr })
    }
  }

  return {
    officeId,
    ...(role === "AGENT" && { assignedAgents: { some: { userId } } }),
    ...(filters.status && { status: filters.status }),
    ...(filters.transactionType && { transactionType: filters.transactionType }),
    ...(filters.propertyType && { propertyType: filters.propertyType }),
    // Area range as a single object to satisfy Prisma's IntNullableFilter
    ...(filters.areaMin != null || filters.areaMax != null
      ? {
          area: {
            ...(filters.areaMin != null && { gte: filters.areaMin }),
            ...(filters.areaMax != null && { lte: filters.areaMax }),
          },
        }
      : {}),
    ...(filters.hasElevator && { hasElevator: true }),
    ...(filters.hasParking && { hasParking: true }),
    ...(filters.hasStorage && { hasStorage: true }),
    ...(filters.hasBalcony && { hasBalcony: true }),
    ...(filters.hasSecurity && { hasSecurity: true }),
    ...(andConditions.length > 0 && { AND: andConditions }),
  }
}

/**
 * Builds the Prisma orderBy clause based on the sort param.
 */
export function buildOrderBy(
  sort: FileFilters["sort"]
): Prisma.PropertyFileOrderByWithRelationInput {
  switch (sort) {
    case "oldest":
      return { createdAt: "asc" }
    case "price_asc":
      return { salePrice: "asc" }
    case "price_desc":
      return { salePrice: "desc" }
    case "area_asc":
      return { area: "asc" }
    case "area_desc":
      return { area: "desc" }
    default:
      return { updatedAt: "desc" }
  }
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
