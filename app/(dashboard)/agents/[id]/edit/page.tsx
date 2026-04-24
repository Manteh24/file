import { notFound, redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { PageHeader } from "@/components/shared/PageHeader"
import { AgentForm } from "@/components/agents/AgentForm"
import type { AgentDetail } from "@/types"
import { canOfficeDo } from "@/lib/office-permissions"
import { getEffectiveSubscription } from "@/lib/subscription"

interface EditAgentPageProps {
  params: Promise<{ id: string }>
}

export default async function EditAgentPage({ params }: EditAgentPageProps) {
  const session = await auth()
  if (!session) redirect("/login")
  if (!canOfficeDo(session.user, "manageAgents")) redirect("/dashboard")

  const { id } = await params
  const { officeId } = session.user

  const [agent, office, sub] = await Promise.all([
    db.user.findFirst({
      where: { id, officeId, role: "AGENT" },
      select: {
        id: true,
        username: true,
        displayName: true,
        email: true,
        isActive: true,
        canFinalizeContracts: true,
        officeMemberRole: true,
        permissionsOverride: true,
        branchId: true,
        officeId: true,
        createdAt: true,
        updatedAt: true,
        _count: { select: { fileAssignments: true } },
        fileAssignments: {
          select: {
            file: { select: { id: true, transactionType: true, status: true } },
          },
        },
      },
    }),
    db.office.findUnique({ where: { id: officeId! }, select: { multiBranchEnabled: true } }),
    getEffectiveSubscription(officeId!),
  ])

  if (!agent) notFound()

  return (
    <div className="space-y-6 max-w-lg">
      <PageHeader title="ویرایش مشاور" description={`ویرایش اطلاعات ${agent.displayName}`} />
      <AgentForm
        initialData={agent as unknown as AgentDetail}
        agentId={id}
        plan={sub?.plan ?? "FREE"}
        multiBranchEnabled={office?.multiBranchEnabled ?? false}
      />
    </div>
  )
}
