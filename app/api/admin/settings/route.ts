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

  void logAdminAction(session.user.id, "UPDATE_PLATFORM_SETTINGS", "PLATFORM", "settings", updates)

  return NextResponse.json({ success: true, data: updates })
}
