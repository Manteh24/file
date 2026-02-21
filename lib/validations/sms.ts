import { z } from "zod"

// Accepts Iranian mobile numbers: 09XXXXXXXXX (11 digits) or 9XXXXXXXXX (10 digits)
const iranianMobileRegex = /^0?9\d{9}$/

export const sendSmsSchema = z.object({
  phone: z
    .string()
    .regex(iranianMobileRegex, "شماره موبایل معتبر نیست (مثال: ۰۹۱۲۳۴۵۶۷۸۹)"),
  message: z
    .string()
    .min(1, "متن پیامک نمی‌تواند خالی باشد")
    .max(500, "متن پیامک نباید بیشتر از ۵۰۰ کاراکتر باشد"),
})

export type SendSmsInput = z.infer<typeof sendSmsSchema>
