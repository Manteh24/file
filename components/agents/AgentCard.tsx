import Link from "next/link"
import { UserCircle, Briefcase } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { formatJalali } from "@/lib/utils"
import type { AgentSummary } from "@/types"

interface AgentCardProps {
  agent: AgentSummary
}

export function AgentCard({ agent }: AgentCardProps) {
  return (
    <Link href={`/agents/${agent.id}`} className="block group">
      <Card className="transition-shadow hover:shadow-md">
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
    </Link>
  )
}
