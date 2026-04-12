import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { redirect } from "next/navigation"
import { PageHeader } from "@/components/shared/PageHeader"
import { TrialFeatureWarning } from "@/components/shared/TrialFeatureWarning"
import { ReportsTabs } from "@/components/reports/ReportsTabs"

export default async function ReportsLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session?.user) redirect("/login")
  if (session.user.role !== "MANAGER") redirect("/dashboard")
  const { officeId } = session.user
  if (!officeId) redirect("/admin/dashboard")

  const subscription = await db.subscription.findUnique({
    where: { officeId },
    select: { isTrial: true, trialEndsAt: true },
  })

  return (
    <div className="space-y-6">
      <PageHeader title="گزارشات" description="عملکرد مالی و فعالیت‌های دفتر" />
      {subscription && (
        <TrialFeatureWarning feature="hasReports" subscription={subscription} />
      )}
      <ReportsTabs />
      {children}
    </div>
  )
}
