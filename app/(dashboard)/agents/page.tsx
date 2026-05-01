import { Download, Users } from "lucide-react"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { redirect } from "next/navigation"
import { PageHeader } from "@/components/shared/PageHeader"
import { EmptyState } from "@/components/shared/EmptyState"
import { AgentCard } from "@/components/agents/AgentCard"
import { NewAgentButton } from "@/components/agents/NewAgentButton"
import { Badge } from "@/components/ui/badge"
import type { AgentSummary } from "@/types"
import { canOfficeDo } from "@/lib/office-permissions"
import { resolveUserBranchScope } from "@/lib/branch-scope"

interface AgentsPageProps {
  searchParams: Promise<{ branchId?: string }>
}

export default async function AgentsPage({ searchParams }: AgentsPageProps) {
  const session = await auth()
  if (!session) redirect("/login")
  // Plain agents have no access to this section
  if (!canOfficeDo(session.user, "manageAgents")) redirect("/dashboard")

  const params = await searchParams
  const { officeId } = session.user

  const office = await db.office.findUnique({
    where: { id: officeId! },
    select: { managerIsAgent: true, multiBranchEnabled: true },
  })
  const multiBranchEnabled = office?.multiBranchEnabled ?? false

  const branchFilter = resolveUserBranchScope(
    session.user,
    { multiBranchEnabled },
    params.branchId ?? null
  )
  const branchFilterActive = "branchId" in branchFilter

  const agents = await db.user.findMany({
    where: { officeId, role: "AGENT", ...branchFilter },
    select: {
      id: true,
      username: true,
      displayName: true,
      email: true,
      isActive: true,
      canFinalizeContracts: true,
      officeMemberRole: true,
      branchId: true,
      createdAt: true,
      branch: { select: { id: true, name: true, isHeadquarters: true } },
      _count: { select: { fileAssignments: true } },
    },
    orderBy: { createdAt: "desc" },
  })

  // When managerIsAgent is enabled, prepend the manager. Skip when a branch
  // filter is active — the manager has no branchId, so a narrowed view
  // shouldn't surface them.
  type AgentRow = (typeof agents)[number] & { isManager?: boolean }
  let rows: AgentRow[] = agents
  if (office?.managerIsAgent && !branchFilterActive) {
    const manager = await db.user.findFirst({
      where: { officeId, role: "MANAGER", isActive: true },
      select: {
        id: true,
        username: true,
        displayName: true,
        email: true,
        isActive: true,
        canFinalizeContracts: true,
        officeMemberRole: true,
        branchId: true,
        createdAt: true,
        branch: { select: { id: true, name: true, isHeadquarters: true } },
        _count: { select: { fileAssignments: true } },
      },
    })
    if (manager) {
      rows = [{ ...manager, isManager: true }, ...agents]
    }
  }

  const totalCount = rows.length
  const headerTitle = multiBranchEnabled ? "تیم" : "مشاوران"
  const headerCountLabel = multiBranchEnabled ? "عضو" : "مشاور"
  const emptyMessage = multiBranchEnabled
    ? "هنوز عضوی به تیم اضافه نشده است"
    : "مشاوری ثبت نشده است"
  const emptyDescription = multiBranchEnabled
    ? "برای شروع، اولین عضو تیم خود را اضافه کنید"
    : "برای شروع، اولین مشاور خود را اضافه کنید"
  const emptyActionLabel = multiBranchEnabled ? "افزودن عضو" : "افزودن مشاور"

  // Group by branch only when multi-branch is on, the user is viewing
  // "all branches", and there's actually more than one branch represented.
  const distinctBranchIds = new Set(rows.map((r) => r.branch?.id ?? "__none__"))
  const showGroupedLayout =
    multiBranchEnabled && !branchFilterActive && distinctBranchIds.size > 1

  return (
    <div className="space-y-6">
      <PageHeader
        title={headerTitle}
        description={`${totalCount.toLocaleString("fa-IR")} ${headerCountLabel}`}
        actions={
          <>
            <a
              href="/api/export/agents"
              className="inline-flex items-center gap-1.5 rounded-md border border-input bg-background px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-foreground"
            >
              <Download className="h-3.5 w-3.5" />
              دریافت خروجی
            </a>
            <NewAgentButton multiBranchEnabled={multiBranchEnabled} />
          </>
        }
      />

      {rows.length === 0 ? (
        <EmptyState
          icon={<Users className="h-12 w-12" />}
          message={emptyMessage}
          description={emptyDescription}
          actionLabel={emptyActionLabel}
          actionHref="/agents/new"
        />
      ) : showGroupedLayout ? (
        <GroupedRows rows={rows} multiBranchEnabled={multiBranchEnabled} />
      ) : (
        <FlatGrid rows={rows} multiBranchEnabled={multiBranchEnabled} />
      )}
    </div>
  )
}

type AgentRowWithBranch = AgentSummary & {
  branch?: { id: string; name: string; isHeadquarters: boolean } | null
  isManager?: boolean
}

function FlatGrid({ rows, multiBranchEnabled }: { rows: AgentRowWithBranch[]; multiBranchEnabled: boolean }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {rows.map((agent) => (
        <AgentRow key={agent.id} agent={agent} multiBranchEnabled={multiBranchEnabled} />
      ))}
    </div>
  )
}

function GroupedRows({ rows, multiBranchEnabled }: { rows: AgentRowWithBranch[]; multiBranchEnabled: boolean }) {
  // Bucket: HQ first → other branches alphabetical → "بدون شعبه" last.
  const groups = new Map<
    string,
    { name: string; isHeadquarters: boolean; rank: number; members: AgentRowWithBranch[] }
  >()

  for (const r of rows) {
    const key = r.branch?.id ?? "__none__"
    if (!groups.has(key)) {
      groups.set(key, {
        name: r.branch?.name ?? "بدون شعبه",
        isHeadquarters: r.branch?.isHeadquarters ?? false,
        rank: r.branch ? (r.branch.isHeadquarters ? 0 : 1) : 2,
        members: [],
      })
    }
    groups.get(key)!.members.push(r)
  }

  const ordered = Array.from(groups.entries()).sort(([, a], [, b]) => {
    if (a.rank !== b.rank) return a.rank - b.rank
    return a.name.localeCompare(b.name, "fa")
  })

  return (
    <div className="space-y-6">
      {ordered.map(([key, group]) => (
        <section key={key} className="space-y-3">
          <header className="flex items-baseline justify-between border-b pb-2">
            <h3 className="text-sm font-medium text-foreground">
              {group.name}
              {group.isHeadquarters && (
                <span className="text-muted-foreground"> (مرکزی)</span>
              )}
            </h3>
            <span className="text-xs text-muted-foreground">
              {group.members.length.toLocaleString("fa-IR")} عضو
            </span>
          </header>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {group.members.map((agent) => (
              <AgentRow key={agent.id} agent={agent} multiBranchEnabled={multiBranchEnabled} />
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}

function AgentRow({ agent, multiBranchEnabled }: { agent: AgentRowWithBranch; multiBranchEnabled: boolean }) {
  return (
    <div className="relative">
      {agent.isManager && (
        <div className="absolute top-2 start-2 z-10">
          <Badge variant="secondary" className="text-xs">
            {multiBranchEnabled ? "مدیر کل" : "مدیر دفتر"}
          </Badge>
        </div>
      )}
      <AgentCard
        agent={agent as AgentSummary}
        // Manager row: no edit/delete — manager edits their own profile at /profile
        readOnly={agent.isManager ?? false}
      />
    </div>
  )
}
