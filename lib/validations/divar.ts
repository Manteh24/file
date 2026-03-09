import { z } from "zod"

export const divarImportSchema = z.object({
  url: z
    .string()
    .url("آدرس معتبر نیست")
    .refine((u) => u.includes("divar.ir"), "لینک باید از دیوار باشد"),
})

export type DivarImportInput = z.infer<typeof divarImportSchema>
