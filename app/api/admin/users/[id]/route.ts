import { NextResponse } from "next/server"
import { z } from "zod"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { getAccessibleOfficeIds, logAdminAction } from "@/lib/admin"

const patchSchema = z.object({
  adminNote: z.string().max(2000).optional(),
})

async function canAccessUser(userId: string, accessibleIds: string[] | null): Promise<boolean> {
  if (accessibleIds === null) return true
  const user = await db.user.findUnique({ where: { id: userId }, select: { officeId: true } })
  if (!user || user.officeId === null) return false
  return accessibleIds.includes(user.officeId)
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: userId } = await params
  const session = await auth()
  if (!session) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  if (!["SUPER_ADMIN", "MID_ADMIN"].includes(session.user.role)) {
    return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 })
  }

  const accessibleIds = await getAccessibleOfficeIds(session.user)
  if (!(await canAccessUser(userId, accessibleIds))) {
    return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 })
  }

  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      username: true,
      displayName: true,
      email: true,
      role: true,
      isActive: true,
      adminNote: true,
      createdAt: true,
      office: { select: { id: true, name: true, city: true } },
      sessions: { select: { id: true, createdAt: true, expiresAt: true }, orderBy: { createdAt: "desc" } },
    },
  })

  if (!user) return NextResponse.json({ success: false, error: "یافت نشد" }, { status: 404 })

  return NextResponse.json({ success: true, data: user })
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: userId } = await params
  const session = await auth()
  if (!session) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  if (!["SUPER_ADMIN", "MID_ADMIN"].includes(session.user.role)) {
    return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 })
  }

  const accessibleIds = await getAccessibleOfficeIds(session.user)
  if (!(await canAccessUser(userId, accessibleIds))) {
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

  const updated = await db.user.update({
    where: { id: userId },
    data: { adminNote: parsed.data.adminNote ?? null },
    select: { id: true, adminNote: true },
  })

  void logAdminAction(session.user.id, "UPDATE_USER_NOTE", "USER", userId, { adminNote: parsed.data.adminNote })

  return NextResponse.json({ success: true, data: updated })
}
