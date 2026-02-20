import { z } from "zod"

// ─── Contract Create Schema ────────────────────────────────────────────────────
// officeShare is NOT in this schema — it is computed server-side as:
//   officeShare = commissionAmount - agentShare
// The refine below enforces that agentShare ≤ commissionAmount (officeShare ≥ 0).

export const createContractSchema = z
  .object({
    fileId: z.string().min(1, "انتخاب فایل الزامی است"),
    // Final agreed price (basis for commission calculation)
    finalPrice: z.coerce.number().int().positive("قیمت نهایی معامله الزامی است"),
    // Commission breakdown — all in Toman
    commissionAmount: z.coerce.number().int().min(0, "مبلغ کمیسیون نامعتبر است"),
    agentShare: z.coerce.number().int().min(0, "سهم مشاور نامعتبر است"),
    notes: z.string().max(2000).optional().or(z.literal("")),
  })
  .refine((data) => data.agentShare <= data.commissionAmount, {
    message: "سهم مشاور نمی‌تواند از مبلغ کمیسیون بیشتر باشد",
    path: ["agentShare"],
  })

export type CreateContractInput = z.infer<typeof createContractSchema>
