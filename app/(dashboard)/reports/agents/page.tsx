import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { redirect } from "next/navigation"
import Link from "next/link"
import { format } from "date-fns-jalali"
import {
  normalisePeriod,
  getDateFilter,
  PERIOD_OPTIONS,
} from "../helpers"
import { AgentPodium } from "@/components/reports/AgentPodium"
import { AgentMonthlyTrendChart } from "@/components/reports/AgentMonthlyTrendChart"
import { AgentCommissionBarChart } from "@/components/reports/AgentCommissionBarChart"
import { AgentDealTypesChart } from "@/components/reports/AgentDealTypesChart"
import { AgentConversionChart } from "@/components/reports/AgentConversionChart"
import { AgentPipelineChart } from "@/components/reports/AgentPipelineChart"
import { EmptyState } from "@/components/shared/EmptyState"
import { Users } from "lucide-react"

interface Props {
  searchParams: Promise<{ period?: string }>
}

// Months short labels matching the Jalali calendar month numbers 1–12
const MONTH_SHORT = [
  "",
  "فرو", "ارد", "خرد", "تیر", "مرد", "شهر",
  "مهر", "آبا", "آذر", "دی", "بهم", "اسف",
]

interface AgentData {
  userId: string
  displayName: string
  deals: number
  commissionAmount: number
  byType: Record<string, number>
  byMonth: Record<string, { count: number; commission: number }>
}

export default async function AgentsReportPage({ searchParams }: Props) {
  const session = await auth()
  if (!session?.user) redirect("/login")
  if (session.user.role !== "MANAGER") redirect("/dashboard")
  const { officeId } = session.user
  if (!officeId) redirect("/admin/dashboard")

  const params = await searchParams
  const activePeriod = normalisePeriod(params.period)
  const from = getDateFilter(activePeriod)
  const dateWhere = from ? { gte: from } : undefined

  // ── Fetch data ──────────────────────────────────────────────────────────────
  const [contracts, activeAssignments, allAssignments] = await Promise.all([
    db.contract.findMany({
      where: { officeId, ...(dateWhere && { finalizedAt: dateWhere }) },
      select: {
        id: true,
        fileId: true,
        transactionType: true,
        commissionAmount: true,
        finalizedAt: true,
      },
    }),
    // Active pipeline: all ACTIVE files with their assigned agents
    db.fileAssignment.findMany({
      where: {
        user: { officeId },
        file: { officeId, status: "ACTIVE" },
      },
      select: {
        userId: true,
        user: { select: { displayName: true } },
      },
    }),
    // All assignments ever — denominator for conversion rate
    db.fileAssignment.findMany({
      where: { user: { officeId } },
      select: {
        userId: true,
        user: { select: { displayName: true } },
      },
    }),
  ])

  // Fetch file assignments for contracts in period
  const contractFileIds = contracts.map((c) => c.fileId)
  const fileAssignments =
    contractFileIds.length > 0
      ? await db.fileAssignment.findMany({
          where: { fileId: { in: contractFileIds } },
          select: {
            userId: true,
            fileId: true,
            user: { select: { displayName: true } },
          },
        })
      : []

  // ── Build per-agent map ─────────────────────────────────────────────────────
  const contractById = new Map(contracts.map((c) => [c.fileId, c]))
  const agentMap = new Map<string, AgentData>()

  for (const fa of fileAssignments) {
    const contract = contractById.get(fa.fileId)
    if (!contract) continue

    if (!agentMap.has(fa.userId)) {
      agentMap.set(fa.userId, {
        userId: fa.userId,
        displayName: fa.user.displayName,
        deals: 0,
        commissionAmount: 0,
        byType: {},
        byMonth: {},
      })
    }
    const agent = agentMap.get(fa.userId)!
    agent.deals += 1
    agent.commissionAmount += Number(contract.commissionAmount)
    agent.byType[contract.transactionType] =
      (agent.byType[contract.transactionType] ?? 0) + 1

    const monthKey = format(contract.finalizedAt, "yyyy/MM")
    const existing = agent.byMonth[monthKey] ?? { count: 0, commission: 0 }
    agent.byMonth[monthKey] = {
      count: existing.count + 1,
      commission: existing.commission + Number(contract.commissionAmount),
    }
  }

  const agentList = Array.from(agentMap.values()).sort(
    (a, b) => b.commissionAmount - a.commissionAmount
  )
  const top8 = agentList.slice(0, 8)

  // ── Monthly trend chart data ────────────────────────────────────────────────
  const allMonthKeys = new Set<string>()
  for (const agent of top8) {
    Object.keys(agent.byMonth).forEach((k) => allMonthKeys.add(k))
  }
  const sortedMonthKeys = Array.from(allMonthKeys).sort()

  const monthlyAgentData = sortedMonthKeys.map((key) => {
    const monthNum = parseInt(key.split("/")[1] ?? "0", 10)
    const label = MONTH_SHORT[monthNum] ?? key
    const row: Record<string, string | number> = { label }
    for (const agent of top8) {
      const m = agent.byMonth[key]
      row[`${agent.userId}_count`] = m?.count ?? 0
      row[`${agent.userId}_commission`] = m?.commission ?? 0
    }
    return row
  })

  // ── Active pipeline per agent ───────────────────────────────────────────────
  const pipelineMap = new Map<string, { userId: string; displayName: string; activeFiles: number }>()
  for (const fa of activeAssignments) {
    if (!pipelineMap.has(fa.userId)) {
      pipelineMap.set(fa.userId, {
        userId: fa.userId,
        displayName: fa.user.displayName,
        activeFiles: 0,
      })
    }
    pipelineMap.get(fa.userId)!.activeFiles += 1
  }
  const pipelineList = Array.from(pipelineMap.values()).sort(
    (a, b) => b.activeFiles - a.activeFiles
  )

  // ── Conversion rate per agent ───────────────────────────────────────────────
  const totalAssignedMap = new Map<string, { userId: string; displayName: string; total: number }>()
  for (const fa of allAssignments) {
    if (!totalAssignedMap.has(fa.userId)) {
      totalAssignedMap.set(fa.userId, {
        userId: fa.userId,
        displayName: fa.user.displayName,
        total: 0,
      })
    }
    totalAssignedMap.get(fa.userId)!.total += 1
  }

  const conversionList = Array.from(totalAssignedMap.values())
    .map((a) => {
      const closed = agentMap.get(a.userId)?.deals ?? 0
      const rate = a.total > 0 ? Math.round((closed / a.total) * 100) : 0
      return {
        userId: a.userId,
        displayName: a.displayName,
        closed,
        total: a.total,
        rate,
      }
    })
    .filter((a) => a.total > 0)
    .sort((a, b) => b.rate - a.rate)

  const avgConversionRate =
    conversionList.length > 0
      ? Math.round(
          conversionList.reduce((acc, a) => acc + a.rate, 0) / conversionList.length
        )
      : 0

  // ── Period filter link helper ───────────────────────────────────────────────
  function periodHref(opt: { value: string }) {
    return opt.value === "this_year"
      ? "/reports/agents"
      : `/reports/agents?period=${opt.value}`
  }

  const hasData = agentList.length > 0 || pipelineList.length > 0

  return (
    <div className="space-y-6">
      {/* Period filter */}
      <div className="flex gap-1 overflow-x-auto pb-1">
        {PERIOD_OPTIONS.map((opt) => {
          const isActive = activePeriod === opt.value
          return (
            <Link
              key={opt.value}
              href={periodHref(opt)}
              className={`shrink-0 rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
              }`}
            >
              {opt.label}
            </Link>
          )
        })}
      </div>

      {!hasData ? (
        <EmptyState
          icon={<Users className="h-10 w-10" />}
          message="داده‌ای یافت نشد"
          description="در بازه انتخاب‌شده هیچ قراردادی ثبت نشده است"
        />
      ) : (
        <>
          {/* Podium — top 3 agents by commission */}
          <AgentPodium
            agents={agentList.slice(0, 3).map((a) => ({
              displayName: a.displayName,
              deals: a.deals,
              commissionAmount: a.commissionAmount,
            }))}
          />

          {/* Monthly trend — full width, most important chart */}
          {monthlyAgentData.length > 1 && (
            <AgentMonthlyTrendChart
              data={monthlyAgentData}
              agents={top8.map((a) => ({
                userId: a.userId,
                displayName: a.displayName,
              }))}
            />
          )}

          {/* Commission + deal types — side by side on desktop */}
          {agentList.length > 0 && (
            <div className="grid gap-4 lg:grid-cols-2">
              <AgentCommissionBarChart
                data={agentList.map((a) => ({
                  displayName: a.displayName,
                  commissionAmount: a.commissionAmount,
                  deals: a.deals,
                }))}
              />
              <AgentDealTypesChart
                data={agentList.map((a) => ({
                  displayName: a.displayName,
                  byType: a.byType,
                }))}
              />
            </div>
          )}

          {/* Conversion rate + active pipeline — side by side on desktop */}
          <div className="grid gap-4 lg:grid-cols-2">
            {conversionList.length > 0 && (
              <AgentConversionChart
                data={conversionList}
                avgRate={avgConversionRate}
              />
            )}
            {pipelineList.length > 0 && (
              <AgentPipelineChart data={pipelineList} />
            )}
          </div>
        </>
      )}
    </div>
  )
}
