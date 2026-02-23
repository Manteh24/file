import { z } from "zod"

export const generateDescriptionSchema = z.object({
  transactionType: z.enum(["SALE", "LONG_TERM_RENT", "SHORT_TERM_RENT", "PRE_SALE"]),
  propertyType: z
    .enum(["APARTMENT", "HOUSE", "VILLA", "LAND", "COMMERCIAL", "OFFICE", "OTHER"])
    .nullable()
    .optional(),
  area: z.number().int().positive().nullable().optional(),
  floorNumber: z.number().int().nullable().optional(),
  totalFloors: z.number().int().positive().nullable().optional(),
  buildingAge: z.number().int().min(0).nullable().optional(),
  salePrice: z.number().int().positive().nullable().optional(),
  depositAmount: z.number().int().positive().nullable().optional(),
  rentAmount: z.number().int().positive().nullable().optional(),
  address: z.string().max(500).nullable().optional(),
  neighborhood: z.string().max(100).nullable().optional(),
  hasElevator: z.boolean().optional(),
  hasParking: z.boolean().optional(),
  hasStorage: z.boolean().optional(),
  hasBalcony: z.boolean().optional(),
  hasSecurity: z.boolean().optional(),
  tone: z.enum(["formal", "standard", "compelling"]),
})

export type GenerateDescriptionInput = z.infer<typeof generateDescriptionSchema>
