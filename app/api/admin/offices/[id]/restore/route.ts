import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { logAdminAction } from "@/lib/admin"

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  if (session.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 })
  }

  const { id } = await params

  const office = await db.office.findUnique({ where: { id }, select: { id: true, name: true, deletedAt: true } })
  if (!office) return NextResponse.json({ success: false, error: "دفتر یافت نشد" }, { status: 404 })
  if (!office.deletedAt) {
    return NextResponse.json({ success: false, error: "دفتر بایگانی نشده است" }, { status: 409 })
  }

  await db.office.update({ where: { id }, data: { deletedAt: null } })

  void logAdminAction(session.user.id, "RESTORE_OFFICE", "OFFICE", id, { officeName: office.name })

  return NextResponse.json({ success: true })
}
