import Link from "next/link"
import {
  BarChart3,
  FileText,
  TrendingUp,
  Users,
  Activity,
} from "lucide-react"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { redirect } from "next/navigation"
import { formatToman, formatJalali } from "@/lib/utils"
import { PageHeader } from "@/components/shared/PageHeader"
import { EmptyState } from "@/components/shared/EmptyState"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  normalisePeriod,
  getDateFilter,
  getTransactionTypeLabel,
  getActivityActionLabel,
  PERIOD_OPTIONS,
  type ReportPeriod,
} from "./helpers"
import type { TransactionType } from "@/types"

interface ReportsPageProps {
  searchParams: Promise<{ period?: string }>
}

const TRANSACTION_TYPES: TransactionType[] = [
  "SALE",
  "PRE_SALE",
  "LONG_TERM_RENT",
  "SHORT_TERM_RENT",
]

export default async function ReportsPage({ searchParams }: ReportsPageProps) {
  const session = await auth()
  if (!session?.user) redirect("/login")
  if (session.user.role !== "MANAGER") redirect("/dashboard")

  const { officeId } = session.user
  if (!officeId) redirect("/admin/dashboard")

  const params = await searchParams
  const activePeriod = normalisePeriod(params.period)
  const from = getDateFilter(activePeriod)
  const dateWhere = from ? { gte: from } : undefined

  const [contracts, activityLogs] = await Promise.all([
    db.contract.findMany({
      where: {
        officeId,
        ...(dateWhere && { finalizedAt: dateWhere }),
      },
      select: {
        id: true,
        fileId: true,
        transactionType: true,
        finalPrice: true,
        commissionAmount: true,
        agentShare: true,
        officeShare: true,
        finalizedAt: true,
        finalizedBy: { select: { displayName: true } },
        file: { select: { address: true, neighborhood: true } },
      },
      orderBy: { finalizedAt: "desc" },
    }),
    db.activityLog.findMany({
      // ActivityLog has no officeId column — filter via file relation
      where: {
        file: { officeId },
        ...(dateWhere && { createdAt: dateWhere }),
      },
      select: {
        id: true,
        action: true,
        createdAt: true,
        user: { select: { displayName: true } },
        file: { select: { address: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
  ])

  // Fetch agent assignments for the period's contracts (depends on contracts query)
  const contractFileIds = contracts.map((c) => c.fileId)
  const agentAssignments =
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

  // ─── KPI aggregation ──────────────────────────────────────────────────────
  const totalDeals = contracts.length
  const totalCommission = contracts.reduce(
    (acc, c) => acc + c.commissionAmount,
    BigInt(0)
  )
  const totalOfficeShare = contracts.reduce(
    (acc, c) => acc + c.officeShare,
    BigInt(0)
  )
  const totalAgentShare = contracts.reduce(
    (acc, c) => acc + c.agentShare,
    BigInt(0)
  )

  // ─── By transaction type ──────────────────────────────────────────────────
  const typeBreakdown = TRANSACTION_TYPES.map((type) => {
    const filtered = contracts.filter((c) => c.transactionType === type)
    return {
      type,
      label: getTransactionTypeLabel(type),
      count: filtered.length,
      commission: filtered.reduce((acc, c) => acc + c.commissionAmount, BigInt(0)),
    }
  }).filter((t) => t.count > 0)

  // ─── Agent performance ────────────────────────────────────────────────────
  // Build a map of contract finalPrice/agentShare per fileId for quick lookup
  const contractByFileId = new Map(contracts.map((c) => [c.fileId, c]))
  const agentMap = new Map<
    string,
    { displayName: string; deals: number; agentShare: bigint }
  >()
  for (const assignment of agentAssignments) {
    const contract = contractByFileId.get(assignment.fileId)
    if (!contract) continue
    const existing = agentMap.get(assignment.userId)
    if (existing) {
      existing.deals += 1
      existing.agentShare += contract.agentShare
    } else {
      agentMap.set(assignment.userId, {
        displayName: assignment.user.displayName,
        deals: 1,
        agentShare: contract.agentShare,
      })
    }
  }
  const agentPerformance = Array.from(agentMap.values()).sort(
    (a, b) => b.deals - a.deals
  )

  const recentContracts = contracts.slice(0, 15)

  return (
    <div className="space-y-6">
      <PageHeader
        title="گزارشات"
        description="عملکرد مالی و فعالیت‌های دفتر"
      />

      {/* Period filter tabs */}
      <div className="flex gap-1 overflow-x-auto pb-1">
        {PERIOD_OPTIONS.map((opt) => {
          const href =
            opt.value === "this_year"
              ? "/reports"
              : `/reports?period=${opt.value}`
          const isActive = activePeriod === opt.value

          return (
            <Link
              key={opt.value}
              href={href}
              className={`shrink-0 rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                isActive
                  ? "bg-primary text-primary-foreground visited:text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground visited:text-muted-foreground"
              }`}
            >
              {opt.label}
            </Link>
          )
        })}
      </div>

      {/* KPI cards — 2×2 on mobile, 4-col on desktop */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard
          title="تعداد معاملات"
          value={totalDeals.toLocaleString("fa-IR")}
          icon={<BarChart3 className="h-4 w-4" />}
        />
        <KpiCard
          title="کل کمیسیون"
          value={formatToman(totalCommission)}
          icon={<TrendingUp className="h-4 w-4" />}
        />
        <KpiCard
          title="سهم دفتر"
          value={formatToman(totalOfficeShare)}
          icon={<FileText className="h-4 w-4" />}
        />
        <KpiCard
          title="سهم مشاوران"
          value={formatToman(totalAgentShare)}
          icon={<Users className="h-4 w-4" />}
        />
      </div>

      {/* Type breakdown + Agent performance side-by-side on desktop */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* By transaction type */}
        <Card>
          <CardHeader>
            <CardTitle>بر اساس نوع معامله</CardTitle>
          </CardHeader>
          <CardContent>
            {typeBreakdown.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">
                هیچ معامله‌ای در این بازه زمانی ثبت نشده است
              </p>
            ) : (
              <ul className="space-y-3">
                {typeBreakdown.map((item) => (
                  <li
                    key={item.type}
                    className="flex items-center justify-between gap-2"
                  >
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">{item.label}</Badge>
                      <span className="text-sm text-muted-foreground">
                        {item.count.toLocaleString("fa-IR")} معامله
                      </span>
                    </div>
                    <span className="text-sm font-medium">
                      {formatToman(item.commission)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Agent performance */}
        <Card>
          <CardHeader>
            <CardTitle>عملکرد مشاوران</CardTitle>
          </CardHeader>
          <CardContent>
            {agentPerformance.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">
                هیچ معامله‌ای در این بازه زمانی ثبت نشده است
              </p>
            ) : (
              <ul className="space-y-3">
                {agentPerformance.map((agent) => (
                  <li
                    key={agent.displayName}
                    className="flex items-center justify-between gap-2"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">
                        {agent.displayName}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {agent.deals.toLocaleString("fa-IR")} معامله
                      </span>
                    </div>
                    <span className="text-sm">{formatToman(agent.agentShare)}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent contracts */}
      <Card>
        <CardHeader>
          <CardTitle>آخرین قراردادها</CardTitle>
        </CardHeader>
        <CardContent>
          {recentContracts.length === 0 ? (
            <EmptyState
              icon={<FileText className="h-10 w-10" />}
              message="قراردادی یافت نشد"
              description="در بازه زمانی انتخاب‌شده هیچ قراردادی ثبت نشده است"
            />
          ) : (
            <ul className="divide-y">
              {recentContracts.map((contract) => (
                <li key={contract.id}>
                  <Link
                    href={`/contracts/${contract.id}`}
                    className="flex items-center justify-between gap-3 py-3 text-sm hover:bg-accent/50 rounded-lg px-2 -mx-2 transition-colors"
                  >
                    <div className="min-w-0 space-y-0.5">
                      <p className="truncate font-medium">
                        {contract.file.address ??
                          contract.file.neighborhood ??
                          "آدرس ثبت نشده"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {contract.finalizedBy.displayName} ·{" "}
                        {formatJalali(contract.finalizedAt)}
                      </p>
                    </div>
                    <div className="shrink-0 text-left space-y-0.5">
                      <p className="font-medium text-emerald-700 dark:text-emerald-400">
                        {formatToman(contract.commissionAmount)}
                      </p>
                      <Badge variant="secondary" className="text-xs">
                        {getTransactionTypeLabel(
                          contract.transactionType as TransactionType
                        )}
                      </Badge>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Recent activity log */}
      <Card>
        <CardHeader>
          <CardTitle>آخرین فعالیت‌ها</CardTitle>
        </CardHeader>
        <CardContent>
          {activityLogs.length === 0 ? (
            <EmptyState
              icon={<Activity className="h-10 w-10" />}
              message="فعالیتی یافت نشد"
              description="در بازه زمانی انتخاب‌شده هیچ فعالیتی ثبت نشده است"
            />
          ) : (
            <ul className="divide-y">
              {activityLogs.map((log) => (
                <li
                  key={log.id}
                  className="flex items-center justify-between gap-3 py-3 text-sm"
                >
                  <div className="min-w-0 space-y-0.5">
                    <p className="truncate text-muted-foreground">
                      {log.file.address ?? "آدرس ثبت نشده"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {log.user.displayName}
                    </p>
                  </div>
                  <div className="shrink-0 text-left space-y-0.5">
                    <Badge variant="outline">
                      {getActivityActionLabel(log.action)}
                    </Badge>
                    <p className="text-xs text-muted-foreground text-left">
                      {formatJalali(log.createdAt)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// ─── Local sub-component ──────────────────────────────────────────────────────

interface KpiCardProps {
  title: string
  value: string
  icon: React.ReactNode
}

function KpiCard({ title, value, icon }: KpiCardProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {title}
          </CardTitle>
          <span className="text-muted-foreground">{icon}</span>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-lg font-bold leading-tight">{value}</p>
      </CardContent>
    </Card>
  )
}
