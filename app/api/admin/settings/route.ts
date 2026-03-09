import { NextResponse } from "next/server"
import { z } from "zod"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { logAdminAction } from "@/lib/admin"
import { setSetting } from "@/lib/platform-settings"

const patchSchema = z.object({
  TRIAL_LENGTH_DAYS: z
    .string()
    .regex(/^\d+$/, "باید عدد صحیح باشد")
    .refine((v) => {
      const n = parseInt(v, 10)
      return n >= 1 && n <= 365
    }, "باید بین ۱ تا ۳۶۵ روز باشد")
    .optional(),
  MAINTENANCE_MODE: z.enum(["true", "false"]).optional(),
  ZARINPAL_MODE: z.enum(["sandbox", "production"]).optional(),
  AVALAI_MODEL: z.string().min(1, "نام مدل نمی‌تواند خالی باشد").max(100).optional(),
  FREE_MAX_USERS: z
    .string()
    .regex(/^\d+$/, "باید عدد صحیح غیرمنفی باشد")
    .refine((v) => parseInt(v, 10) >= 0, "باید ۰ یا بیشتر باشد")
    .optional(),
  FREE_MAX_FILES: z
    .string()
    .regex(/^\d+$/, "باید عدد صحیح غیرمنفی باشد")
    .refine((v) => parseInt(v, 10) >= 0, "باید ۰ یا بیشتر باشد")
    .optional(),
  FREE_MAX_AI_MONTH: z
    .string()
    .regex(/^\d+$/, "باید عدد صحیح غیرمنفی باشد")
    .refine((v) => parseInt(v, 10) >= 0, "باید ۰ یا بیشتر باشد")
    .optional(),
  DEFAULT_REFERRAL_COMMISSION: z
    .string()
    .regex(/^\d+$/, "باید عدد صحیح غیرمنفی باشد")
    .refine((v) => parseInt(v, 10) >= 0, "باید ۰ یا بیشتر باشد")
    .optional(),
})

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  if (session.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 })
  }

  const settings = await db.platformSetting.findMany()
  const data = Object.fromEntries(settings.map((s) => [s.key, s.value]))

  return NextResponse.json({ success: true, data })
}

export async function PATCH(request: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  if (session.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ success: false, error: "بدنه نامعتبر" }, { status: 400 })
  }

  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.issues[0]?.message ?? "خطا در داده‌ها" },
      { status: 400 }
    )
  }

  const updates: Record<string, string> = {}
  for (const [key, value] of Object.entries(parsed.data)) {
    if (value !== undefined) {
      await setSetting(key, value, session.user.id)
      updates[key] = value
    }
  }

  // Propagate new default commission to all auto-generated office codes.
  // Admin-created partner codes (createdByAdminId != null) are intentionally left unchanged.
  if (updates.DEFAULT_REFERRAL_COMMISSION !== undefined) {
    const newCommission = parseInt(updates.DEFAULT_REFERRAL_COMMISSION, 10)
    await db.referralCode.updateMany({
      where: { officeId: { not: null }, createdByAdminId: null },
      data: { commissionPerOfficePerMonth: newCommission },
    })
  }

  void logAdminAction(session.user.id, "UPDATE_PLATFORM_SETTINGS", "PLATFORM", "settings", updates)

  return NextResponse.json({ success: true, data: updates })
}
