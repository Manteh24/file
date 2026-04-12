import { Medal } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { formatToman } from "@/lib/utils"

interface AgentEntry {
  displayName: string
  deals: number
  commissionAmount: number
}

interface Props {
  agents: AgentEntry[]
}

const RANK_STYLES = [
  {
    bg: "bg-yellow-50 dark:bg-yellow-950/30 border-yellow-200 dark:border-yellow-800",
    badge: "bg-yellow-400 text-yellow-950",
    label: "اول",
  },
  {
    bg: "bg-slate-50 dark:bg-slate-900/30 border-slate-200 dark:border-slate-700",
    badge: "bg-slate-400 text-slate-950",
    label: "دوم",
  },
  {
    bg: "bg-orange-50 dark:bg-orange-950/30 border-orange-200 dark:border-orange-800",
    badge: "bg-orange-400 text-orange-950",
    label: "سوم",
  },
] as const

export function AgentPodium({ agents }: Props) {
  if (agents.length === 0) return null

  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {agents.map((agent, i) => {
        const style = RANK_STYLES[i]
        if (!style) return null
        return (
          <Card key={agent.displayName} className={`border ${style.bg}`}>
            <CardContent className="p-4 space-y-2 text-center">
              <div
                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold ${style.badge}`}
              >
                <Medal className="h-3 w-3" />
                رتبه {style.label}
              </div>
              <p className="font-semibold text-base leading-tight">{agent.displayName}</p>
              <p className="text-sm text-muted-foreground">
                {agent.deals.toLocaleString("fa-IR")} معامله
              </p>
              <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">
                {formatToman(agent.commissionAmount)}
              </p>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
