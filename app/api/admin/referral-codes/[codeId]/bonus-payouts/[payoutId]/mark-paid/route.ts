import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { canAdminDo, getAccessibleOfficeIds, logAdminAction } from "@/lib/admin"

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ codeId: string; payoutId: string }> }
) {
  const { codeId, payoutId } = await params
  const session = await auth()
  if (!session) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  if (!["SUPER_ADMIN", "MID_ADMIN"].includes(session.user.role)) {
    return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 })
  }
  if (!canAdminDo(session.user, "manageSubscriptions")) {
    return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 })
  }

  // Office-scope guard: MID_ADMIN can only act on codes whose owning office is accessible.
  const accessibleIds = await getAccessibleOfficeIds(session.user)
  if (accessibleIds !== null) {
    const code = await db.referralCode.findUnique({ where: { id: codeId }, select: { officeId: true } })
    if (!code) return NextResponse.json({ success: false, error: "یافت نشد" }, { status: 404 })
    if (code.officeId !== null && !accessibleIds.includes(code.officeId)) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 })
    }
  }

  const payout = await db.referralBonusPayout.findUnique({ where: { id: payoutId } })
  if (!payout || payout.referralCodeId !== codeId) {
    return NextResponse.json({ success: false, error: "یافت نشد" }, { status: 404 })
  }
  if (payout.status === "PAID") {
    return NextResponse.json(
      { success: false, error: "این پاداش قبلاً تسویه شده است" },
      { status: 409 }
    )
  }
  if (payout.status === "VOIDED") {
    return NextResponse.json(
      { success: false, error: "این پاداش لغو شده است و قابل پرداخت نیست" },
      { status: 409 }
    )
  }

  await db.referralBonusPayout.update({
    where: { id: payoutId },
    data: { status: "PAID", paidAt: new Date(), paidByAdminId: session.user.id },
  })

  void logAdminAction(session.user.id, "MARK_BONUS_PAID", "REFERRAL_CODE", codeId, {
    payoutId,
    referredOfficeId: payout.referredOfficeId,
    amountToman: payout.amountToman,
  })

  return NextResponse.json({ success: true })
}
