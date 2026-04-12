import { z } from "zod"

// ─── Customer Type Enum ─────────────────────────────────────────────────────────

export const CustomerTypeEnum = z.enum(["BUYER", "RENTER", "SELLER", "LANDLORD"])

// ─── Customer Create Schema ─────────────────────────────────────────────────────

export const createCustomerSchema = z.object({
  name: z.string().min(1, "نام الزامی است").max(100),
  // Iranian phone: 11 digits starting with 09, or 10-digit landline, or +98 prefix
  phone: z
    .string()
    .min(1, "شماره تماس الزامی است")
    .regex(/^(\+98|0)?[0-9]{9,11}$/, "شماره تماس معتبر نیست"),
  email: z.string().email("ایمیل معتبر نیست").optional().or(z.literal("")),
  // Multi-type: at least one type required
  types: z.array(CustomerTypeEnum).min(1, "حداقل یک نوع مشتری انتخاب کنید"),
  notes: z.string().max(2000).optional().or(z.literal("")),
})

export type CreateCustomerInput = z.infer<typeof createCustomerSchema>

// ─── Customer Update Schema ─────────────────────────────────────────────────────
// All fields optional — partial update (PATCH semantics).

export const updateCustomerSchema = createCustomerSchema.partial()

export type UpdateCustomerInput = z.infer<typeof updateCustomerSchema>

// ─── Customer Note Schema ───────────────────────────────────────────────────────

export const customerNoteSchema = z.object({
  content: z.string().min(1, "متن یادداشت الزامی است").max(2000),
})

export type CustomerNoteInput = z.infer<typeof customerNoteSchema>

// ─── Customer Filters Schema ────────────────────────────────────────────────────

export const customerFiltersSchema = z.object({
  type: z.enum(["BUYER", "RENTER", "SELLER", "LANDLORD"]).optional(),
})

export type CustomerFilters = z.infer<typeof customerFiltersSchema>
