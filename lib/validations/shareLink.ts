import { z } from "zod"

export const createShareLinkSchema = z.object({
  // If set, shown to the customer instead of the file's real price.
  // Must be a positive integer (Toman). Leave null/undefined to show file's actual price.
  customPrice: z
    .number()
    .int("قیمت باید عدد صحیح باشد")
    .positive("قیمت باید بیشتر از صفر باشد")
    .optional()
    .nullable(),
})

export type CreateShareLinkInput = z.infer<typeof createShareLinkSchema>
