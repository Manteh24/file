import { z } from "zod"

export const updateSubscriptionSchema = z.object({
  plan: z.enum(["FREE", "PRO", "TEAM"]).optional(),
  status: z.enum(["ACTIVE", "GRACE", "LOCKED", "CANCELLED"]).optional(),
  isTrial: z.boolean().optional(),
  // Number of days to extend the trial or current period by
  extendDays: z.number().int().min(1).max(365).optional(),
})

export const ADMIN_TIERS = ["SUPPORT", "FINANCE", "FULL_ACCESS"] as const

export const createMidAdminSchema = z.object({
  username: z
    .string()
    .min(3, "حداقل ۳ کاراکتر")
    .max(32)
    .regex(/^[a-z0-9_]+$/, "فقط حروف انگلیسی کوچک، اعداد و _"),
  displayName: z.string().min(2, "نام نمایشی الزامی است").max(64),
  email: z.string().email("ایمیل نامعتبر").optional().or(z.literal("")),
  password: z.string().min(8, "رمز عبور حداقل ۸ کاراکتر"),
  tier: z.enum(ADMIN_TIERS).optional(),
})

export const updateMidAdminTierSchema = z.object({
  tier: z.enum(ADMIN_TIERS).nullable(),
})

export const updateMidAdminProfileSchema = z.object({
  displayName: z.string().min(2, "نام نمایشی الزامی است").max(64),
  email: z.string().email("ایمیل نامعتبر").optional().or(z.literal("")),
  newPassword: z.string().min(8, "رمز عبور حداقل ۸ کاراکتر").optional().or(z.literal("")),
})

export const setAssignmentsSchema = z.object({
  officeIds: z.array(z.string().cuid()).max(100),
})

export const toggleActiveSchema = z.object({
  active: z.boolean(),
})

export const createOfficeNoteSchema = z.object({
  content: z.string().min(1, "محتوا الزامی است").max(2000, "حداکثر ۲۰۰۰ کاراکتر"),
})

export const subscriptionFiltersSchema = z.object({
  plan: z.enum(["FREE", "PRO", "TEAM"]).optional(),
  status: z.enum(["ACTIVE", "GRACE", "LOCKED", "CANCELLED"]).optional(),
  isTrial: z.enum(["true", "false"]).optional(),
  expiringSoon: z.enum(["true"]).optional(),
  billingCycle: z.enum(["MONTHLY", "ANNUAL"]).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
})

export const paymentFiltersSchema = z.object({
  status: z.enum(["PENDING", "VERIFIED", "FAILED"]).optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  officeId: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
})

export const actionLogFiltersSchema = z.object({
  adminId: z.string().optional(),
  action: z.string().optional(),
  targetType: z.enum(["OFFICE", "USER", "SUBSCRIPTION", "MID_ADMIN"]).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
})
