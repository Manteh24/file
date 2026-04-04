import { Users } from "lucide-react"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { redirect } from "next/navigation"
import { PageHeader } from "@/components/shared/PageHeader"
import { EmptyState } from "@/components/shared/EmptyState"
import { AgentCard } from "@/components/agents/AgentCard"
import { NewAgentButton } from "@/components/agents/NewAgentButton"
import { Badge } from "@/components/ui/badge"
import type { AgentSummary } from "@/types"

export default async function AgentsPage() {
  const session = await auth()
  if (!session) redirect("/login")
  // Agents have no access to this section
  if (session.user.role !== "MANAGER") redirect("/dashboard")

  const { officeId } = session.user

  const [agents, office] = await Promise.all([
    db.user.findMany({
      where: { officeId, role: "AGENT" },
      select: {
        id: true,
        username: true,
        displayName: true,
        email: true,
        isActive: true,
        canFinalizeContracts: true,
        createdAt: true,
        _count: { select: { fileAssignments: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    db.office.findUnique({
      where: { id: officeId! },
      select: { managerIsAgent: true },
    }),
  ])

  // When managerIsAgent is enabled, prepend the manager with a special flag
  type AgentRow = (typeof agents)[number] & { isManager?: boolean }
  let rows: AgentRow[] = agents
  if (office?.managerIsAgent) {
    const manager = await db.user.findFirst({
      where: { officeId, role: "MANAGER", isActive: true },
      select: {
        id: true,
        username: true,
        displayName: true,
        email: true,
        isActive: true,
        canFinalizeContracts: true,
        createdAt: true,
        _count: { select: { fileAssignments: true } },
      },
    })
    if (manager) {
      rows = [{ ...manager, isManager: true }, ...agents]
    }
  }

  const totalCount = rows.length

  return (
    <div className="space-y-6">
      <PageHeader
        title="مشاوران"
        description={`${totalCount.toLocaleString("fa-IR")} مشاور`}
        actions={<NewAgentButton />}
      />

      {rows.length === 0 ? (
        <EmptyState
          icon={<Users className="h-12 w-12" />}
          message="مشاوری ثبت نشده است"
          description="برای شروع، اولین مشاور خود را اضافه کنید"
          actionLabel="افزودن مشاور"
          actionHref="/agents/new"
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((agent) => (
            <div key={agent.id} className="relative">
              {agent.isManager && (
                <div className="absolute top-2 start-2 z-10">
                  <Badge variant="secondary" className="text-xs">مدیر دفتر</Badge>
                </div>
              )}
              <AgentCard
                agent={agent as AgentSummary}
                // Manager row: no edit/delete — manager edits their own profile at /profile
                readOnly={agent.isManager ?? false}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
