import Link from "next/link"
import { Plus, Users } from "lucide-react"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { redirect } from "next/navigation"
import { Button } from "@/components/ui/button"
import { PageHeader } from "@/components/shared/PageHeader"
import { EmptyState } from "@/components/shared/EmptyState"
import { AgentCard } from "@/components/agents/AgentCard"
import type { AgentSummary } from "@/types"

export default async function AgentsPage() {
  const session = await auth()
  if (!session) redirect("/login")
  // Agents have no access to this section
  if (session.user.role !== "MANAGER") redirect("/dashboard")

  const { officeId } = session.user

  const agents = await db.user.findMany({
    where: { officeId, role: "AGENT" },
    select: {
      id: true,
      username: true,
      displayName: true,
      email: true,
      isActive: true,
      createdAt: true,
      _count: { select: { fileAssignments: true } },
    },
    orderBy: { createdAt: "desc" },
  })

  return (
    <div className="space-y-6">
      <PageHeader
        title="مشاوران"
        description={`${agents.length.toLocaleString("fa-IR")} مشاور`}
        actions={
          <Button asChild>
            <Link href="/agents/new">
              <Plus className="h-4 w-4 rtl:ml-1.5 ltr:mr-1.5" />
              مشاور جدید
            </Link>
          </Button>
        }
      />

      {agents.length === 0 ? (
        <EmptyState
          icon={<Users className="h-12 w-12" />}
          message="مشاوری ثبت نشده است"
          description="برای شروع، اولین مشاور خود را اضافه کنید"
          actionLabel="افزودن مشاور"
          actionHref="/agents/new"
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {agents.map((agent) => (
            <AgentCard key={agent.id} agent={agent as AgentSummary} />
          ))}
        </div>
      )}
    </div>
  )
}
