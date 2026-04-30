import { z } from "zod"

export const updateSubscriptionSchema = z.object({
  plan: z.enum(["FREE", "PRO", "TEAM"]).optional(),
  status: z.enum(["ACTIVE", "GRACE", "LOCKED", "CANCELLED"]).optional(),
  isTrial: z.boolean().optional(),
  // Number of days to extend the trial or current period by
  extendDays: z.number().int().min(1).max(365).optional(),
})

export const ADMIN_TIERS = ["SUPPORT", "FINANCE", "FULL_ACCESS"] as const

// Per-capability overrides for mid-admins. Stored on User.permissionsOverride
// (Json) — only the four admin capability keys are honoured.
export const adminPermissionsOverrideSchema = z
  .object({
    manageSubscriptions: z.boolean().optional(),
    manageUsers: z.boolean().optional(),
    securityActions: z.boolean().optional(),
    broadcast: z.boolean().optional(),
  })
  .strict()

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
  permissionsOverride: adminPermissionsOverrideSchema.optional(),
})

export const updateMidAdminTierSchema = z.object({
  tier: z.enum(ADMIN_TIERS).nullable().optional(),
  permissionsOverride: adminPermissionsOverrideSchema.optional(),
})

export const updateMidAdminProfileSchema = z.object({
  displayName: z.string().min(2, "نام نمایشی الزامی است").max(64),
  email: z.string().email("ایمیل نامعتبر").optional().or(z.literal("")),
  newPassword: z.string().min(8, "رمز عبور حداقل ۸ کاراکتر").optional().or(z.literal("")),
})

export const setAssignmentsSchema = z.object({
  officeIds: z.array(z.string().cuid()).max(100),
})

// Dynamic access rule — matches offices by city/plan/trial. Empty arrays = no
// constraint on that dimension. Multiple rules are OR'd together.
const accessRuleSchema = z.object({
  cities: z.array(z.string().min(1).max(64)).max(100),
  plans: z.array(z.enum(["FREE", "PRO", "TEAM"])).max(3),
  trialFilter: z.enum(["ANY", "TRIAL_ONLY", "PAID_ONLY"]),
}).refine(
  (r) => r.cities.length > 0 || r.plans.length > 0 || r.trialFilter !== "ANY",
  { message: "هر قانون دسترسی باید حداقل یک فیلتر داشته باشد" }
)

export const setAccessRulesSchema = z.object({
  rules: z.array(accessRuleSchema).max(20),
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
