import { z } from "zod"

const priceField = z
  .number()
  .int("قیمت باید عدد صحیح باشد")
  .positive("قیمت باید بیشتر از صفر باشد")
  .optional()
  .nullable()

export const createShareLinkSchema = z.object({
  // For SALE/PRE_SALE: custom sale price. For SHORT_TERM_RENT: custom rent amount.
  // For LONG_TERM_RENT: custom اجاره (rent) amount.
  customPrice: priceField,
  // For LONG_TERM_RENT only: custom رهن (deposit) amount.
  customDepositAmount: priceField,
})

export type CreateShareLinkInput = z.infer<typeof createShareLinkSchema>
