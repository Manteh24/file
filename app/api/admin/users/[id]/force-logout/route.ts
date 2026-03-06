import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { canAdminDo, getAccessibleOfficeIds, logAdminAction } from "@/lib/admin"

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: userId } = await params
  const session = await auth()
  if (!session) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  if (!["SUPER_ADMIN", "MID_ADMIN"].includes(session.user.role)) {
    return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 })
  }

  if (session.user.role === "MID_ADMIN" && !canAdminDo(session.user, "securityActions")) {
    return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 })
  }

  const accessibleIds = await getAccessibleOfficeIds(session.user)
  if (accessibleIds !== null) {
    const user = await db.user.findUnique({ where: { id: userId }, select: { officeId: true } })
    if (!user || user.officeId === null || !accessibleIds.includes(user.officeId)) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 })
    }
  }

  const { count: sessionsDeleted } = await db.userSession.deleteMany({ where: { userId } })

  void logAdminAction(session.user.id, "FORCE_LOGOUT_USER", "USER", userId, { sessionsDeleted })

  return NextResponse.json({ success: true, data: { sessionsDeleted } })
}
