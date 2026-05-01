import { NextResponse } from "next/server"
import { z } from "zod"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { logAdminAction } from "@/lib/admin"

const upsertSchema = z.object({
  label: z.string().min(1, "عنوان نمی‌تواند خالی باشد").max(50),
  body: z.string().min(1, "متن نمی‌تواند خالی باشد").max(2000),
  isDefault: z.boolean().optional(),
})

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  if (session.user.role !== "SUPER_ADMIN" && session.user.role !== "MID_ADMIN") {
    return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 })
  }

  const signatures = await db.adminSignature.findMany({
    where: { adminId: session.user.id },
    orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
    select: { id: true, label: true, body: true, isDefault: true, createdAt: true, updatedAt: true },
  })

  return NextResponse.json({ success: true, data: signatures })
}

export async function POST(request: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  if (session.user.role !== "SUPER_ADMIN" && session.user.role !== "MID_ADMIN") {
    return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ success: false, error: "بدنه نامعتبر" }, { status: 400 })
  }

  const parsed = upsertSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.issues[0]?.message ?? "خطا در داده‌ها" },
      { status: 400 }
    )
  }

  const adminId = session.user.id
  const makeDefault = parsed.data.isDefault === true

  const created = await db.$transaction(async (tx) => {
    if (makeDefault) {
      await tx.adminSignature.updateMany({
        where: { adminId, isDefault: true },
        data: { isDefault: false },
      })
    }
    return tx.adminSignature.create({
      data: {
        adminId,
        label: parsed.data.label,
        body: parsed.data.body,
        isDefault: makeDefault,
      },
      select: { id: true, label: true, body: true, isDefault: true, createdAt: true, updatedAt: true },
    })
  })

  void logAdminAction(adminId, "CREATE_ADMIN_SIGNATURE", "ADMIN_SIGNATURE", created.id, {
    label: created.label,
  })

  return NextResponse.json({ success: true, data: created })
}
