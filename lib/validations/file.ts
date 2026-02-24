import { z } from "zod"

// ─── Contact Schema ────────────────────────────────────────────────────────────

export const contactSchema = z.object({
  type: z.enum(["OWNER", "TENANT", "LANDLORD", "BUYER"]),
  name: z.string().max(100).optional().or(z.literal("")),
  // Iranian phone: 11 digits starting with 09, or 10-digit landline
  phone: z
    .string()
    .min(1, "شماره تماس الزامی است")
    .regex(/^(\+98|0)?[0-9]{9,11}$/, "شماره تماس معتبر نیست"),
  notes: z.string().max(500).optional().or(z.literal("")),
})

export type ContactInput = z.infer<typeof contactSchema>

// ─── File Create Schema ────────────────────────────────────────────────────────
// Minimum required: transactionType + address (location) + at least 1 contact.

export const createFileSchema = z.object({
  transactionType: z.enum(["SALE", "LONG_TERM_RENT", "SHORT_TERM_RENT", "PRE_SALE"], {
    error: "نوع معامله الزامی است",
  }),
  propertyType: z
    .enum(["APARTMENT", "HOUSE", "VILLA", "LAND", "COMMERCIAL", "OFFICE", "OTHER"])
    .optional(),

  // Physical details
  area: z.coerce.number().int().positive().optional(),
  floorNumber: z.coerce.number().int().min(0).optional(),
  totalFloors: z.coerce.number().int().positive().optional(),
  buildingAge: z.coerce.number().int().min(0).max(150).optional(),

  // Price — which fields are relevant depends on transactionType
  salePrice: z.coerce.number().int().positive().optional(),
  depositAmount: z.coerce.number().int().positive().optional(),
  rentAmount: z.coerce.number().int().positive().optional(),

  // Location — address is the minimum required location field
  latitude: z.coerce.number().min(-90).max(90).optional(),
  longitude: z.coerce.number().min(-180).max(180).optional(),
  address: z.string().min(1, "آدرس الزامی است").max(500),
  neighborhood: z.string().max(200).optional().or(z.literal("")),

  description: z.string().max(5000).optional().or(z.literal("")),
  notes: z.string().max(2000).optional().or(z.literal("")),

  // Amenities
  hasElevator: z.boolean().default(false),
  hasParking: z.boolean().default(false),
  hasStorage: z.boolean().default(false),
  hasBalcony: z.boolean().default(false),
  hasSecurity: z.boolean().default(false),

  // At least 1 contact is required
  contacts: z.array(contactSchema).min(1, "حداقل یک مخاطب الزامی است"),
})

export type CreateFileInput = z.infer<typeof createFileSchema>

// ─── File Update Schema ────────────────────────────────────────────────────────
// All fields optional — partial update (PATCH semantics).

export const updateFileSchema = createFileSchema
  .omit({ contacts: true })
  .partial()
  .extend({
    // Contacts on update: replace the list entirely if provided
    contacts: z.array(contactSchema).min(1, "حداقل یک مخاطب الزامی است").optional(),
  })

export type UpdateFileInput = z.infer<typeof updateFileSchema>

// ─── Status Change Schema ──────────────────────────────────────────────────────

export const changeFileStatusSchema = z.object({
  status: z.enum(["ARCHIVED"], {
    error: "وضعیت معتبر نیست",
  }),
})

export type ChangeFileStatusInput = z.infer<typeof changeFileStatusSchema>

// ─── Assign Agents Schema ──────────────────────────────────────────────────────
// Used by PUT /api/files/[id]/agents — replaces the full assignment list atomically.

export const assignAgentsSchema = z.object({
  agentIds: z.array(z.string()).default([]),
})

export type AssignAgentsInput = z.infer<typeof assignAgentsSchema>

// ─── File Filters Schema ───────────────────────────────────────────────────────

export const SORT_OPTIONS = [
  "newest",
  "oldest",
  "price_asc",
  "price_desc",
  "area_asc",
  "area_desc",
] as const

export type SortOption = (typeof SORT_OPTIONS)[number]

export const fileFiltersSchema = z.object({
  status: z.enum(["ACTIVE", "ARCHIVED", "SOLD", "RENTED", "EXPIRED"]).optional(),
  transactionType: z
    .enum(["SALE", "LONG_TERM_RENT", "SHORT_TERM_RENT", "PRE_SALE"])
    .optional(),
  propertyType: z
    .enum(["APARTMENT", "HOUSE", "VILLA", "LAND", "COMMERCIAL", "OFFICE", "OTHER"])
    .optional(),

  // Text search across address and neighborhood
  search: z.string().max(200).optional(),

  // Price range — stored as Toman integers, coerced from URL strings
  priceMin: z.coerce.number().int().nonnegative().optional(),
  priceMax: z.coerce.number().int().nonnegative().optional(),

  // Area range in square metres
  areaMin: z.coerce.number().int().nonnegative().optional(),
  areaMax: z.coerce.number().int().nonnegative().optional(),

  // Amenity filters — only filter when the param equals "true"; absent = don't filter
  hasElevator: z
    .enum(["true"])
    .transform(() => true)
    .optional(),
  hasParking: z
    .enum(["true"])
    .transform(() => true)
    .optional(),
  hasStorage: z
    .enum(["true"])
    .transform(() => true)
    .optional(),
  hasBalcony: z
    .enum(["true"])
    .transform(() => true)
    .optional(),
  hasSecurity: z
    .enum(["true"])
    .transform(() => true)
    .optional(),

  // Sort order
  sort: z.enum(SORT_OPTIONS).optional(),
})

export type FileFilters = z.infer<typeof fileFiltersSchema>
