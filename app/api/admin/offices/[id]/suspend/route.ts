import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { canAdminDo, getAccessibleOfficeIds, logAdminAction } from "@/lib/admin"

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session) return NextResponse.json({ success: false, error: "احراز هویت الزامی است" }, { status: 401 })
  if (!["SUPER_ADMIN", "MID_ADMIN"].includes(session.user.role)) {
    return NextResponse.json({ success: false, error: "دسترسی ممنوع" }, { status: 403 })
  }

  if (session.user.role === "MID_ADMIN" && !canAdminDo(session.user, "manageSubscriptions")) {
    return NextResponse.json({ success: false, error: "دسترسی ممنوع" }, { status: 403 })
  }

  const { id: officeId } = await params

  const accessibleIds = await getAccessibleOfficeIds(session.user)
  if (accessibleIds !== null && !accessibleIds.includes(officeId)) {
    return NextResponse.json({ success: false, error: "دفتر یافت نشد" }, { status: 404 })
  }

  const existing = await db.subscription.findUnique({
    where: { officeId },
    select: { id: true, status: true },
  })
  if (!existing) {
    return NextResponse.json({ success: false, error: "اشتراک یافت نشد" }, { status: 404 })
  }

  const updated = await db.subscription.update({
    where: { officeId },
    data: { status: "LOCKED" },
    select: { id: true, plan: true, status: true, isTrial: true, billingCycle: true },
  })

  await logAdminAction(session.user.id, "SUSPEND_OFFICE", "OFFICE", officeId, {
    previousStatus: existing.status,
    newStatus: "LOCKED",
  })

  return NextResponse.json({ success: true, data: updated })
}
