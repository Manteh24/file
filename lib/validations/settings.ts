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
  officeBio: z
    .string()
    .max(400, "توضیحات دفتر نمی‌تواند بیشتر از ۴۰۰ کاراکتر باشد")
    .optional()
    .or(z.literal("")),
  photoEnhancementMode: z.enum(["ALWAYS", "NEVER", "ASK"]).optional(),
  watermarkMode: z.enum(["ALWAYS", "NEVER", "ASK"]).optional(),
})

export type UpdateOfficeProfileInput = z.infer<typeof updateOfficeProfileSchema>

// Iranian bank card: 16 digits
const cardNumberRegex = /^\d{16}$/
// IBAN: IR followed by 24 digits
const shebaRegex = /^IR\d{24}$/

export const updateBankDetailsSchema = z.object({
  cardNumber: z
    .string()
    .regex(cardNumberRegex, "شماره کارت باید ۱۶ رقم عددی باشد")
    .optional()
    .or(z.literal("")),
  shebaNumber: z
    .string()
    .regex(shebaRegex, "شماره شبا باید با IR شروع شده و ۲۶ کاراکتر باشد (مثال: IR123456789012345678901234)")
    .optional()
    .or(z.literal("")),
  cardHolderName: z
    .string()
    .max(100, "نام نمی‌تواند بیشتر از ۱۰۰ کاراکتر باشد")
    .optional()
    .or(z.literal("")),
})

export type UpdateBankDetailsInput = z.infer<typeof updateBankDetailsSchema>

// Only PRO and TEAM are purchasable — FREE is always free, trial is granted at registration
export const requestPaymentSchema = z.object({
  plan: z.enum(["PRO", "TEAM"], {
    error: "پلن انتخاب‌شده معتبر نیست",
  }),
  billingCycle: z.enum(["MONTHLY", "ANNUAL"]).default("MONTHLY"),
})

export type RequestPaymentInput = z.infer<typeof requestPaymentSchema>
