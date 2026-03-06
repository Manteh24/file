import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { logAdminAction } from "@/lib/admin"

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ codeId: string; earningId: string }> }
) {
  const { codeId, earningId } = await params
  const session = await auth()
  if (!session) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  if (!["SUPER_ADMIN", "MID_ADMIN"].includes(session.user.role)) {
    return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 })
  }

  const earning = await db.referralMonthlyEarning.findUnique({ where: { id: earningId } })
  if (!earning || earning.referralCodeId !== codeId) {
    return NextResponse.json({ success: false, error: "یافت نشد" }, { status: 404 })
  }
  if (earning.isPaid) {
    return NextResponse.json(
      { success: false, error: "این ماه قبلاً تسویه شده است" },
      { status: 409 }
    )
  }

  await db.referralMonthlyEarning.update({
    where: { id: earningId },
    data: { isPaid: true, paidAt: new Date(), paidByAdminId: session.user.id },
  })

  void logAdminAction(session.user.id, "MARK_REFERRAL_PAID", "REFERRAL_CODE", codeId, {
    earningId,
    yearMonth: earning.yearMonth,
  })

  return NextResponse.json({ success: true })
}
