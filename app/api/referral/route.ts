import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { findActiveReferredOffices } from "@/lib/referral"
import { bigIntToNumber } from "@/lib/utils"
import { canOfficeDo } from "@/lib/office-permissions"

// GET /api/referral — returns the office's referral code data. Owner-only (manageOffice).
export async function GET() {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  if (!canOfficeDo(session.user, "manageOffice")) {
    return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 })
  }

  const { officeId } = session.user
  if (!officeId) return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 })

  const [referralCode, office] = await Promise.all([
    db.referralCode.findUnique({
      where: { officeId },
      include: {
        monthlyEarnings: {
          orderBy: { yearMonth: "desc" },
          take: 12,
        },
      },
    }),
    db.office.findUnique({
      where: { id: officeId },
      select: { cardNumber: true, shebaNumber: true, cardHolderName: true },
    }),
  ])

  if (!referralCode) {
    return NextResponse.json({
      success: true,
      data: { referralCode: null, activeOfficeCount: 0, monthlyEarnings: [], bankDetails: office },
    })
  }

  const activeOfficeIds = await findActiveReferredOffices(referralCode.id)

  const data = {
    referralCode: {
      id: referralCode.id,
      code: referralCode.code,
      commissionPerOfficePerMonth: referralCode.commissionPerOfficePerMonth,
      isActive: referralCode.isActive,
    },
    activeOfficeCount: activeOfficeIds.length,
    estimatedMonthlyEarning:
      activeOfficeIds.length * referralCode.commissionPerOfficePerMonth,
    monthlyEarnings: referralCode.monthlyEarnings.map((e) => ({
      id: e.id,
      yearMonth: e.yearMonth,
      activeOfficeCount: e.activeOfficeCount,
      commissionAmount: bigIntToNumber(e.commissionAmount),
      isPaid: e.isPaid,
      paidAt: e.paidAt,
    })),
    bankDetails: office,
  }

  return NextResponse.json({ success: true, data })
}
