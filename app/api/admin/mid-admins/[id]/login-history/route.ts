import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  if (session.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 })
  }

  const { id } = await params

  // Verify the target user is actually a MID_ADMIN
  const admin = await db.user.findFirst({
    where: { id, role: "MID_ADMIN" },
    select: { id: true },
  })
  if (!admin) return NextResponse.json({ success: false, error: "کاربر یافت نشد" }, { status: 404 })

  const logs = await db.adminLoginLog.findMany({
    where: { adminId: id },
    orderBy: { loginAt: "desc" },
    take: 15,
    select: { id: true, ipAddress: true, userAgent: true, loginAt: true },
  })

  return NextResponse.json({ success: true, data: logs })
}
