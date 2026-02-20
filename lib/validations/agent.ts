import { z } from "zod"

export const createAgentSchema = z.object({
  username: z
    .string()
    .min(3, "نام کاربری باید حداقل ۳ کاراکتر باشد")
    .max(50, "نام کاربری نمی‌تواند بیشتر از ۵۰ کاراکتر باشد")
    .regex(
      /^[a-zA-Z0-9_-]+$/,
      "نام کاربری فقط می‌تواند شامل حروف انگلیسی، اعداد، _ و - باشد"
    ),
  displayName: z
    .string()
    .min(1, "نام نمایشی الزامی است")
    .max(100, "نام نمایشی نمی‌تواند بیشتر از ۱۰۰ کاراکتر باشد"),
  password: z
    .string()
    .min(8, "رمز عبور باید حداقل ۸ کاراکتر باشد")
    .max(72, "رمز عبور نمی‌تواند بیشتر از ۷۲ کاراکتر باشد"),
  email: z
    .string()
    .email("ایمیل معتبر وارد کنید")
    .optional()
    .or(z.literal("")),
})

export type CreateAgentInput = z.infer<typeof createAgentSchema>

// Username cannot change after creation — only displayName and email are editable
export const updateAgentSchema = z.object({
  displayName: z
    .string()
    .min(1, "نام نمایشی الزامی است")
    .max(100, "نام نمایشی نمی‌تواند بیشتر از ۱۰۰ کاراکتر باشد")
    .optional(),
  email: z
    .string()
    .email("ایمیل معتبر وارد کنید")
    .optional()
    .or(z.literal("")),
})

export type UpdateAgentInput = z.infer<typeof updateAgentSchema>

export const resetPasswordSchema = z.object({
  newPassword: z
    .string()
    .min(8, "رمز عبور باید حداقل ۸ کاراکتر باشد")
    .max(72, "رمز عبور نمی‌تواند بیشتر از ۷۲ کاراکتر باشد"),
})

export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>
