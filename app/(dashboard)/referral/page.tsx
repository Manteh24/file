import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { findActiveReferredOffices } from "@/lib/referral"
import { bigIntToNumber } from "@/lib/utils"
import { PageHeader } from "@/components/shared/PageHeader"
import { ReferralDashboard } from "@/components/referral/ReferralDashboard"

export default async function ReferralPage() {
  const session = await auth()
  if (!session?.user) redirect("/login")
  if (session.user.role !== "MANAGER") redirect("/dashboard")

  const { officeId } = session.user
  if (!officeId) redirect("/admin/dashboard")

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

  const activeOfficeCount = referralCode
    ? (await findActiveReferredOffices(referralCode.id)).length
    : 0

  const initialData = {
    referralCode: referralCode
      ? {
          id: referralCode.id,
          code: referralCode.code,
          commissionPerOfficePerMonth: referralCode.commissionPerOfficePerMonth,
          isActive: referralCode.isActive,
        }
      : null,
    activeOfficeCount,
    estimatedMonthlyEarning: referralCode
      ? activeOfficeCount * referralCode.commissionPerOfficePerMonth
      : 0,
    monthlyEarnings: referralCode
      ? referralCode.monthlyEarnings.map((e) => ({
          id: e.id,
          yearMonth: e.yearMonth,
          activeOfficeCount: e.activeOfficeCount,
          commissionAmount: bigIntToNumber(e.commissionAmount),
          isPaid: e.isPaid,
          paidAt: e.paidAt ? e.paidAt.toISOString() : null,
        }))
      : [],
    bankDetails: {
      cardNumber: office?.cardNumber ?? null,
      shebaNumber: office?.shebaNumber ?? null,
      cardHolderName: office?.cardHolderName ?? null,
    },
  }

  return (
    <div className="mx-auto max-w-2xl space-y-10 px-0 md:px-4">
      <PageHeader
        title="کد معرفی"
        description="درآمد از معرفی دفاتر جدید به سامانه"
      />
      <ReferralDashboard initialData={initialData} />
    </div>
  )
}
