import { z } from "zod"

const officeMemberRoleEnum = z.enum([
  "AGENT",
  "BRANCH_MANAGER",
  "ACCOUNTANT",
  "RECEPTIONIST",
  "MARKETING",
  "CUSTOM",
])

const capabilityKey = z.enum([
  "manageAgents",
  "manageBranches",
  "createFile",
  "editFile",
  "deleteFile",
  "assignFile",
  "finalizeContract",
  "viewContracts",
  "viewReports",
  "viewFinancials",
  "manageCustomers",
  "sendSms",
  "sendBulkSms",
  "manageOffice",
  "viewActivityLog",
  "viewAllBranches",
])

const permissionsOverrideSchema = z.record(capabilityKey, z.boolean())

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
  canFinalizeContracts: z.boolean().optional().default(false),
  officeMemberRole: officeMemberRoleEnum.optional(),
  permissionsOverride: permissionsOverrideSchema.optional(),
  branchId: z.string().nullable().optional(),
})

export type CreateAgentInput = z.infer<typeof createAgentSchema>

// Username cannot change after creation — only displayName, email, capability fields are editable
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
  canFinalizeContracts: z.boolean().optional(),
  officeMemberRole: officeMemberRoleEnum.optional(),
  permissionsOverride: permissionsOverrideSchema.nullable().optional(),
  branchId: z.string().nullable().optional(),
})

export type UpdateAgentInput = z.infer<typeof updateAgentSchema>

export const resetPasswordSchema = z.object({
  newPassword: z
    .string()
    .min(8, "رمز عبور باید حداقل ۸ کاراکتر باشد")
    .max(72, "رمز عبور نمی‌تواند بیشتر از ۷۲ کاراکتر باشد"),
})

export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>
