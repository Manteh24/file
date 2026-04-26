import { z } from "zod"

export const createBranchSchema = z.object({
  name: z
    .string()
    .min(1, "نام شعبه الزامی است")
    .max(100, "نام شعبه نمی‌تواند بیشتر از ۱۰۰ کاراکتر باشد"),
  address: z
    .string()
    .max(300, "آدرس نمی‌تواند بیشتر از ۳۰۰ کاراکتر باشد")
    .nullable()
    .optional()
    .or(z.literal("")),
  // Optional: user to promote to BRANCH_MANAGER of this branch. Must be an AGENT
  // in the same office. Route layer enforces that plus the @unique managerId.
  managerId: z.string().nullable().optional(),
})

export type CreateBranchInput = z.infer<typeof createBranchSchema>

export const updateBranchSchema = z.object({
  name: z
    .string()
    .min(1, "نام شعبه الزامی است")
    .max(100, "نام شعبه نمی‌تواند بیشتر از ۱۰۰ کاراکتر باشد")
    .optional(),
  address: z
    .string()
    .max(300, "آدرس نمی‌تواند بیشتر از ۳۰۰ کاراکتر باشد")
    .nullable()
    .optional(),
  // null clears the manager, string sets a new one. Undefined means unchanged.
  managerId: z.string().nullable().optional(),
})

export type UpdateBranchInput = z.infer<typeof updateBranchSchema>
