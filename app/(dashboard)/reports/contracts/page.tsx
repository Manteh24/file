import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { redirect } from "next/navigation"
import { formatToman, formatJalali } from "@/lib/utils"
import Link from "next/link"
import {
  normalisePeriod,
  getDateFilter,
  getTransactionTypeLabel,
  groupByJalaliMonth,
  calcDelta,
  PERIOD_OPTIONS,
} from "../helpers"
import { ContractDeltaKpis } from "@/components/reports/ContractDeltaKpis"
import { ExpiringLeasesCard } from "@/components/reports/ExpiringLeasesCard"
import { ContractVolumeChart } from "@/components/reports/ContractVolumeChart"
import { ContractTypeStackedChart } from "@/components/reports/ContractTypeStackedChart"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { EmptyState } from "@/components/shared/EmptyState"
import { FileText } from "lucide-react"
import type { TransactionType } from "@/types"

interface Props {
  searchParams: Promise<{ period?: string }>
}

const TRANSACTION_TYPES: TransactionType[] = ["SALE", "PRE_SALE", "LONG_TERM_RENT", "SHORT_TERM_RENT"]

// Expiring lease row type returned by $queryRaw
interface ExpiringLeaseRow {
  id: string
  address: string | null
  neighborhood: string | null
  leaseEndDate: Date
  leaseDurationMonths: number
}

export default async function ContractsReportPage({ searchParams }: Props) {
  const session = await auth()
  if (!session?.user) redirect("/login")
  if (session.user.role !== "MANAGER") redirect("/dashboard")
  const { officeId } = session.user
  if (!officeId) redirect("/admin/dashboard")

  const params = await searchParams
  const activePeriod = normalisePeriod(params.period)
  const from = getDateFilter(activePeriod)
  const dateWhere = from ? { gte: from } : undefined

  // Month boundaries for delta KPIs
  const now = new Date()
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59)

  const [contracts, thisMonthAgg, lastMonthAgg, expiringLeases] = await Promise.all([
    db.contract.findMany({
      where: { officeId, ...(dateWhere && { finalizedAt: dateWhere }) },
      select: {
        id: true,
        transactionType: true,
        commissionAmount: true,
        finalizedAt: true,
        file: { select: { address: true, neighborhood: true } },
        finalizedBy: { select: { displayName: true } },
      },
      orderBy: { finalizedAt: "desc" },
    }),
    db.contract.aggregate({
      where: { officeId, finalizedAt: { gte: thisMonthStart } },
      _count: { id: true },
      _sum: { commissionAmount: true },
    }),
    db.contract.aggregate({
      where: { officeId, finalizedAt: { gte: lastMonthStart, lte: lastMonthEnd } },
      _count: { id: true },
      _sum: { commissionAmount: true },
    }),
    db.$queryRaw<ExpiringLeaseRow[]>`
      SELECT c.id,
             pf.address,
             pf.neighborhood,
             (c."finalizedAt" + (c."leaseDurationMonths" || ' months')::interval)::timestamp AS "leaseEndDate",
             c."leaseDurationMonths"
      FROM contracts c
      JOIN property_files pf ON pf.id = c."fileId"
      WHERE c."officeId" = ${officeId}
        AND c."transactionType" = 'LONG_TERM_RENT'
        AND c."leaseDurationMonths" IS NOT NULL
        AND (c."finalizedAt" + (c."leaseDurationMonths" || ' months')::interval)
            BETWEEN NOW() AND NOW() + INTERVAL '90 days'
      ORDER BY "leaseEndDate" ASC
    `,
  ])

  // Delta calculations
  const thisCount = thisMonthAgg._count.id
  const lastCount = lastMonthAgg._count.id
  const thisCommission = Number(thisMonthAgg._sum.commissionAmount ?? BigInt(0))
  const lastCommission = Number(lastMonthAgg._sum.commissionAmount ?? BigInt(0))
  const countDelta = calcDelta(thisCount, lastCount)
  const commissionDelta = calcDelta(thisCommission, lastCommission)

  // Monthly trend grouped by Jalali month
  const contractsForCharts = contracts.map((c) => ({
    ...c,
    commissionAmount: Number(c.commissionAmount),
  }))
  const monthlyGroups = groupByJalaliMonth(contractsForCharts, "finalizedAt")
  const volumeData = monthlyGroups.map((g) => ({
    label: g.label,
    count: g.items.length,
    commission: g.items.reduce((acc, c) => acc + c.commissionAmount, 0),
  }))

  // Type-over-time stacked data
  const typeStackedData = monthlyGroups.map((g) => {
    const row: Record<string, string | number> = { label: g.label }
    for (const type of TRANSACTION_TYPES) {
      row[type] = g.items.filter((c) => c.transactionType === type).length
    }
    return row
  })

  const recentContracts = contracts.slice(0, 15)

  return (
    <div className="space-y-6">
      {/* Period filter */}
      <div className="flex gap-1 overflow-x-auto pb-1">
        {PERIOD_OPTIONS.map((opt) => {
          const href = opt.value === "this_year" ? "/reports/contracts" : `/reports/contracts?period=${opt.value}`
          const isActive = activePeriod === opt.value
          return (
            <Link key={opt.value} href={href}
              className={`shrink-0 rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
              }`}
            >{opt.label}</Link>
          )
        })}
      </div>

      {/* Delta KPIs */}
      <ContractDeltaKpis
        thisCount={thisCount}
        lastCount={lastCount}
        thisCommission={thisCommission}
        lastCommission={lastCommission}
        countDelta={countDelta}
        commissionDelta={commissionDelta}
      />

      {/* Expiring leases alert */}
      {expiringLeases.length > 0 && (
        <ExpiringLeasesCard leases={expiringLeases.map((l) => ({
          id: l.id,
          address: l.address,
          neighborhood: l.neighborhood,
          leaseEndDate: new Date(l.leaseEndDate),
        }))} />
      )}

      {/* Volume + commission combo chart */}
      {volumeData.length > 0 && <ContractVolumeChart data={volumeData} />}

      {/* Type breakdown over time */}
      {typeStackedData.length > 0 && (
        <ContractTypeStackedChart data={typeStackedData} />
      )}

      {/* Recent contracts table */}
      <Card>
        <CardHeader><CardTitle>آخرین قراردادها</CardTitle></CardHeader>
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
                        {contract.file.address ?? contract.file.neighborhood ?? "آدرس ثبت نشده"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {contract.finalizedBy.displayName} · {formatJalali(contract.finalizedAt)}
                      </p>
                    </div>
                    <div className="shrink-0 text-left space-y-0.5">
                      <p className="font-medium text-emerald-700 dark:text-emerald-400">
                        {formatToman(contract.commissionAmount)}
                      </p>
                      <Badge variant="secondary" className="text-xs">
                        {getTransactionTypeLabel(contract.transactionType as TransactionType)}
                      </Badge>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
