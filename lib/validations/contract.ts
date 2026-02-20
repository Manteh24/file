import { z } from "zod"

// ─── Contract Create Schema ────────────────────────────────────────────────────
// Used when a manager finalizes a deal and creates a contract.

export const createContractSchema = z.object({
  fileId: z.string().min(1, "انتخاب فایل الزامی است"),
  // Final agreed price (used as basis for commission calculation)
  finalPrice: z.coerce.number().int().positive("قیمت نهایی معامله الزامی است"),
  // Commission breakdown — all in Toman
  commissionAmount: z.coerce
    .number()
    .int()
    .min(0, "مبلغ کمیسیون نامعتبر است"),
  agentShare: z.coerce.number().int().min(0, "سهم مشاور نامعتبر است"),
  officeShare: z.coerce.number().int().min(0, "سهم دفتر نامعتبر است"),
  notes: z.string().max(2000).optional().or(z.literal("")),
})

export type CreateContractInput = z.infer<typeof createContractSchema>
