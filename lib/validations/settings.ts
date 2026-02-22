import { z } from "zod"

// Iranian landline (0XXXXXXXXXX) or mobile (09XXXXXXXXX) — 10–11 digits with optional +98 prefix
const iranianPhoneRegex = /^(\+98|0)?[0-9]{9,11}$/

export const updateOfficeProfileSchema = z.object({
  name: z
    .string()
    .min(1, "نام دفتر الزامی است")
    .max(100, "نام دفتر نمی‌تواند بیشتر از ۱۰۰ کاراکتر باشد"),
  phone: z
    .string()
    .regex(iranianPhoneRegex, "شماره تماس معتبر نیست")
    .optional()
    .or(z.literal("")),
  email: z
    .string()
    .email("ایمیل معتبر وارد کنید")
    .optional()
    .or(z.literal("")),
  address: z
    .string()
    .max(500, "آدرس نمی‌تواند بیشتر از ۵۰۰ کاراکتر باشد")
    .optional()
    .or(z.literal("")),
  city: z
    .string()
    .max(100, "نام شهر نمی‌تواند بیشتر از ۱۰۰ کاراکتر باشد")
    .optional()
    .or(z.literal("")),
})

export type UpdateOfficeProfileInput = z.infer<typeof updateOfficeProfileSchema>

// Only SMALL and LARGE are purchasable — TRIAL is granted automatically at registration
export const requestPaymentSchema = z.object({
  plan: z.enum(["SMALL", "LARGE"], {
    error: "پلن انتخاب‌شده معتبر نیست",
  }),
})

export type RequestPaymentInput = z.infer<typeof requestPaymentSchema>
