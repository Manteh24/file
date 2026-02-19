import { z } from "zod"

export const registerSchema = z
  .object({
    displayName: z
      .string()
      .min(2, "نام باید حداقل ۲ کاراکتر باشد")
      .max(50, "نام نمی‌تواند بیشتر از ۵۰ کاراکتر باشد"),
    officeName: z
      .string()
      .min(2, "نام دفتر باید حداقل ۲ کاراکتر باشد")
      .max(100, "نام دفتر نمی‌تواند بیشتر از ۱۰۰ کاراکتر باشد"),
    email: z.string().email("ایمیل معتبر وارد کنید"),
    password: z
      .string()
      .min(8, "رمز عبور باید حداقل ۸ کاراکتر باشد")
      // bcrypt silently truncates at 72 bytes — hard cap to prevent silent data loss
      .max(72, "رمز عبور نمی‌تواند بیشتر از ۷۲ کاراکتر باشد"),
    confirmPassword: z.string(),
    referralCode: z
      .string()
      .max(20, "کد معرف نمی‌تواند بیشتر از ۲۰ کاراکتر باشد")
      .optional()
      .or(z.literal("")),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "رمزهای عبور یکسان نیستند",
    path: ["confirmPassword"],
  })

export type RegisterInput = z.infer<typeof registerSchema>

export const loginSchema = z.object({
  // identifier accepts either username or email
  identifier: z.string().min(1, "نام کاربری یا ایمیل را وارد کنید"),
  password: z.string().min(1, "رمز عبور را وارد کنید"),
})

export type LoginInput = z.infer<typeof loginSchema>

export const forgotPasswordSchema = z.object({
  email: z.string().email("ایمیل معتبر وارد کنید"),
})

export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>
