import Link from "next/link"
import { UserCircle, Briefcase, Building2 } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { formatJalali } from "@/lib/utils"
import type { AgentSummary } from "@/types"
import {
  OFFICE_ROLE_LABELS,
  type OfficeMemberRole,
} from "@/lib/office-permissions"

interface AgentCardProps {
  agent: AgentSummary
  // When true, the card is not clickable (used for manager-as-agent rows)
  readOnly?: boolean
}

export function AgentCard({ agent, readOnly = false }: AgentCardProps) {
  const presetLabel =
    agent.officeMemberRole && agent.officeMemberRole !== "AGENT"
      ? OFFICE_ROLE_LABELS[agent.officeMemberRole as OfficeMemberRole]
      : null

  const cardContent = (
    <Card className={`transition-shadow ${readOnly ? "" : "hover:shadow-md"}`}>
      <CardContent className="p-4 space-y-3">
        {/* Header: name + active badge */}
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-medium text-foreground truncate">{agent.displayName}</p>
          <Badge variant={agent.isActive ? "default" : "secondary"} className="shrink-0">
            {agent.isActive ? "فعال" : "غیرفعال"}
          </Badge>
        </div>

        {/* Username */}
        <p className="flex items-center gap-1 text-xs text-muted-foreground">
          <UserCircle className="h-3 w-3 shrink-0 rtl:ml-1" />
          <span dir="ltr">{agent.username}</span>
        </p>

        {/* Optional metadata badges (multi-branch view): branch + preset role */}
        {(agent.branch || presetLabel) && (
          <div className="flex flex-wrap items-center gap-1.5">
            {agent.branch && (
              <Badge variant="outline" className="gap-1 text-xs font-normal">
                <Building2 className="h-3 w-3" />
                {agent.branch.name}
                {agent.branch.isHeadquarters && " (مرکزی)"}
              </Badge>
            )}
            {presetLabel && (
              <Badge variant="outline" className="text-xs font-normal">
                {presetLabel}
              </Badge>
            )}
          </div>
        )}

        {/* Footer: file count + date */}
        <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Briefcase className="h-3 w-3 rtl:ml-1" />
            {agent._count.fileAssignments.toLocaleString("fa-IR")} فایل
          </span>
          <span>{formatJalali(new Date(agent.createdAt))}</span>
        </div>
      </CardContent>
    </Card>
  )

  if (readOnly) return cardContent

  return (
    <Link href={`/agents/${agent.id}`} className="block group">
      {cardContent}
    </Link>
  )
}
