import { notFound, redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { PageHeader } from "@/components/shared/PageHeader"
import { AgentForm } from "@/components/agents/AgentForm"
import type { AgentDetail } from "@/types"

interface EditAgentPageProps {
  params: Promise<{ id: string }>
}

export default async function EditAgentPage({ params }: EditAgentPageProps) {
  const session = await auth()
  if (!session) redirect("/login")
  if (session.user.role !== "MANAGER") redirect("/dashboard")

  const { id } = await params
  const { officeId } = session.user

  const agent = await db.user.findFirst({
    where: { id, officeId, role: "AGENT" },
    select: {
      id: true,
      username: true,
      displayName: true,
      email: true,
      isActive: true,
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
  })

  if (!agent) notFound()

  return (
    <div className="space-y-6 max-w-lg">
      <PageHeader title="ویرایش مشاور" description={`ویرایش اطلاعات ${agent.displayName}`} />
      <AgentForm initialData={agent as AgentDetail} agentId={id} />
    </div>
  )
}
