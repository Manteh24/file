import { z } from "zod"

export const updateSubscriptionSchema = z.object({
  plan: z.enum(["TRIAL", "SMALL", "LARGE"]).optional(),
  status: z.enum(["ACTIVE", "GRACE", "LOCKED", "CANCELLED"]).optional(),
  // Number of days to extend the trial or current period by
  extendDays: z.number().int().min(1).max(365).optional(),
})

export const createMidAdminSchema = z.object({
  username: z
    .string()
    .min(3, "حداقل ۳ کاراکتر")
    .max(32)
    .regex(/^[a-z0-9_]+$/, "فقط حروف انگلیسی کوچک، اعداد و _"),
  displayName: z.string().min(2, "نام نمایشی الزامی است").max(64),
  email: z.string().email("ایمیل نامعتبر").optional().or(z.literal("")),
  password: z.string().min(8, "رمز عبور حداقل ۸ کاراکتر"),
})

export const setAssignmentsSchema = z.object({
  officeIds: z.array(z.string().cuid()).max(100),
})

export const toggleActiveSchema = z.object({
  active: z.boolean(),
})
