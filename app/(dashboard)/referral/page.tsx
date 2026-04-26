import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import {
  getReferralBonusPercent,
  getReferralBonusMaxToman,
  getReferralBonusLifetimeCap,
} from "@/lib/platform-settings"
import { PageHeader } from "@/components/shared/PageHeader"
import { ReferralDashboard } from "@/components/referral/ReferralDashboard"
import { canOfficeDo } from "@/lib/office-permissions"

export default async function ReferralPage() {
  const session = await auth()
  if (!session?.user) redirect("/login")
  if (!canOfficeDo(session.user, "manageOffice")) redirect("/dashboard")

  const { officeId } = session.user
  if (!officeId) redirect("/admin/dashboard")

  const [referralCode, office, bonusPercent, bonusMaxToman, bonusLifetimeCap] = await Promise.all([
    db.referralCode.findUnique({
      where: { officeId },
      include: {
        bonusPayouts: {
          orderBy: { createdAt: "desc" },
          take: 50,
          include: { referredOffice: { select: { name: true } } },
        },
      },
    }),
    db.office.findUnique({
      where: { id: officeId },
      select: { cardNumber: true, shebaNumber: true, cardHolderName: true },
    }),
    getReferralBonusPercent(),
    getReferralBonusMaxToman(),
    getReferralBonusLifetimeCap(),
  ])

  const nonVoidedPayouts = referralCode
    ? referralCode.bonusPayouts.filter((p) => p.status !== "VOIDED")
    : []
  const totalEarnedToman = nonVoidedPayouts
    .filter((p) => p.status === "PAID")
    .reduce((s, p) => s + p.amountToman, 0)
  const pendingToman = nonVoidedPayouts
    .filter((p) => p.status === "PENDING")
    .reduce((s, p) => s + p.amountToman, 0)

  const initialData = {
    referralCode: referralCode
      ? { id: referralCode.id, code: referralCode.code, isActive: referralCode.isActive }
      : null,
    payouts: referralCode
      ? referralCode.bonusPayouts.map((p) => ({
          id: p.id,
          createdAt: p.createdAt.toISOString(),
          paidAt: p.paidAt ? p.paidAt.toISOString() : null,
          paymentToman: p.paymentToman,
          amountToman: p.amountToman,
          status: p.status as "PENDING" | "PAID" | "VOIDED",
          referredOfficeName: p.referredOffice.name,
        }))
      : [],
    payoutCount: nonVoidedPayouts.length,
    totalEarnedToman,
    pendingToman,
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
        description="پاداش یکباره برای هر دفتری که با کد شما اولین پرداخت موفق را انجام دهد"
      />
      <ReferralDashboard
        initialData={initialData}
        bonusPercent={bonusPercent}
        bonusMaxToman={bonusMaxToman}
        bonusLifetimeCap={bonusLifetimeCap}
      />
    </div>
  )
}
