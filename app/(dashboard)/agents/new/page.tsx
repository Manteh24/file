import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { db } from "@/lib/db"
import { PageHeader } from "@/components/shared/PageHeader"
import { AgentForm } from "@/components/agents/AgentForm"
import { canOfficeDo } from "@/lib/office-permissions"
import { getEffectiveSubscription } from "@/lib/subscription"

export default async function NewAgentPage() {
  const session = await auth()
  if (!session) redirect("/login")
  if (!canOfficeDo(session.user, "manageAgents")) redirect("/dashboard")

  const officeId = session.user.officeId!
  const [office, sub] = await Promise.all([
    db.office.findUnique({ where: { id: officeId }, select: { multiBranchEnabled: true } }),
    getEffectiveSubscription(officeId),
  ])

  const multiBranchEnabled = office?.multiBranchEnabled ?? false
  const headerTitle = multiBranchEnabled ? "عضو جدید تیم" : "مشاور جدید"
  const headerDescription = multiBranchEnabled
    ? "اطلاعات عضو جدید تیم را وارد کنید"
    : "اطلاعات مشاور را وارد کنید"

  return (
    <div className="space-y-6 max-w-lg">
      <PageHeader title={headerTitle} description={headerDescription} />
      <AgentForm
        plan={sub?.plan ?? "FREE"}
        multiBranchEnabled={multiBranchEnabled}
      />
    </div>
  )
}
