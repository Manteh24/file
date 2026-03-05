import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { actionLogFiltersSchema } from "@/lib/validations/admin"

export async function GET(req: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ success: false, error: "احراز هویت الزامی است" }, { status: 401 })
  // Only SUPER_ADMIN can view the admin action log
  if (session.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ success: false, error: "دسترسی ممنوع" }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const parsed = actionLogFiltersSchema.safeParse(Object.fromEntries(searchParams))
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: "پارامترهای نامعتبر" }, { status: 400 })
  }

  const { adminId, action, targetType, page, limit } = parsed.data

  const where = {
    ...(adminId ? { adminId } : {}),
    ...(action ? { action } : {}),
    ...(targetType ? { targetType } : {}),
  }

  const [total, logs] = await Promise.all([
    db.adminActionLog.count({ where }),
    db.adminActionLog.findMany({
      where,
      select: {
        id: true,
        action: true,
        targetType: true,
        targetId: true,
        metadata: true,
        createdAt: true,
        admin: { select: { displayName: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
  ])

  const data = logs.map((l) => ({
    id: l.id,
    adminName: l.admin.displayName,
    action: l.action,
    targetType: l.targetType,
    targetId: l.targetId,
    metadata: l.metadata as Record<string, unknown> | null,
    createdAt: l.createdAt,
  }))

  return NextResponse.json({ success: true, data, total, page, limit })
}
