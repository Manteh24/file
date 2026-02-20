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

// ─── File Filters Schema ───────────────────────────────────────────────────────

export const fileFiltersSchema = z.object({
  status: z.enum(["ACTIVE", "ARCHIVED", "SOLD", "RENTED", "EXPIRED"]).optional(),
  transactionType: z
    .enum(["SALE", "LONG_TERM_RENT", "SHORT_TERM_RENT", "PRE_SALE"])
    .optional(),
  propertyType: z
    .enum(["APARTMENT", "HOUSE", "VILLA", "LAND", "COMMERCIAL", "OFFICE", "OTHER"])
    .optional(),
})

export type FileFilters = z.infer<typeof fileFiltersSchema>
