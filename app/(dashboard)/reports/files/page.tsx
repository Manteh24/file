import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { redirect } from "next/navigation"
import Link from "next/link"
import { canOfficeDo } from "@/lib/office-permissions"
import {
  normalisePeriod,
  getDateFilter,
  groupByJalaliMonth,
  PERIOD_OPTIONS,
  FILE_STATUS_LABELS,
  PROPERTY_TYPE_LABELS,
} from "../helpers"
import { FileStatusDonut } from "@/components/reports/FileStatusDonut"
import { FileIntakeChart } from "@/components/reports/FileIntakeChart"
import { FilePropertyTypeChart } from "@/components/reports/FilePropertyTypeChart"
import { FileDaysToCloseChart } from "@/components/reports/FileDaysToCloseChart"
import { FilePriceTrendChart } from "@/components/reports/FilePriceTrendChart"
import { StaleFilesTable } from "@/components/reports/StaleFilesTable"
import type { TransactionType } from "@/types"

interface Props {
  searchParams: Promise<{ period?: string }>
}

interface AvgDaysRow {
  transactionType: string
  avg_days: number | string
}

const TX_LABELS: Record<string, string> = {
  SALE: "فروش",
  LONG_TERM_RENT: "اجاره بلندمدت",
  SHORT_TERM_RENT: "اجاره کوتاه‌مدت",
  PRE_SALE: "پیش‌فروش",
}

export default async function FilesReportPage({ searchParams }: Props) {
  const session = await auth()
  if (!session?.user) redirect("/login")
  if (!canOfficeDo(session.user, "viewReports")) redirect("/dashboard")
  const { officeId } = session.user
  if (!officeId) redirect("/admin/dashboard")

  const params = await searchParams
  const activePeriod = normalisePeriod(params.period)
  const from = getDateFilter(activePeriod)
  const dateWhere = from ? { gte: from } : undefined

  const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000)

  const [
    filesByStatus,
    recentFiles,
    filesByPropertyType,
    avgDaysRows,
    salePriceFiles,
    staleFiles,
  ] = await Promise.all([
    // All-time status breakdown — not filtered by period
    db.propertyFile.groupBy({
      by: ["status"],
      where: { officeId },
      _count: { id: true },
    }),
    // Period-filtered files for intake chart
    db.propertyFile.findMany({
      where: { officeId, ...(dateWhere && { createdAt: dateWhere }) },
      select: { id: true, transactionType: true, createdAt: true },
    }),
    // All-time property type breakdown
    db.propertyFile.groupBy({
      by: ["propertyType"],
      where: { officeId },
      _count: { id: true },
      orderBy: { _count: { id: "desc" } },
    }),
    // Average days from file creation to contract finalization, per transaction type
    db.$queryRaw<AvgDaysRow[]>`
      SELECT pf."transactionType",
             AVG(
               EXTRACT(EPOCH FROM (c."finalizedAt" - pf."createdAt")) / 86400.0
             )::float AS avg_days
      FROM property_files pf
      JOIN contracts c ON c."fileId" = pf.id
      WHERE pf."officeId" = ${officeId}
      GROUP BY pf."transactionType"
    `,
    // SALE/PRE_SALE files with price — for avg price trend
    db.propertyFile.findMany({
      where: {
        officeId,
        transactionType: { in: ["SALE", "PRE_SALE"] },
        salePrice: { not: null },
        ...(dateWhere && { createdAt: dateWhere }),
      },
      select: { salePrice: true, createdAt: true },
      orderBy: { createdAt: "asc" },
    }),
    // Stale: ACTIVE with no contract, older than 60 days
    db.propertyFile.findMany({
      where: {
        officeId,
        status: "ACTIVE",
        createdAt: { lte: sixtyDaysAgo },
        contract: null,
      },
      select: {
        id: true,
        address: true,
        neighborhood: true,
        transactionType: true,
        createdAt: true,
      },
      orderBy: { createdAt: "asc" },
    }),
  ])

  // ── Status donut ─────────────────────────────────────────────────────────────
  const statusData = filesByStatus.map((s) => ({
    status: s.status,
    label: FILE_STATUS_LABELS[s.status] ?? s.status,
    count: s._count.id,
  }))
  const totalFiles = statusData.reduce((acc, s) => acc + s.count, 0)

  // ── Monthly intake stacked data ──────────────────────────────────────────────
  const monthlyGroups = groupByJalaliMonth(recentFiles, "createdAt")
  const intakeData = monthlyGroups.map((g) => {
    const row: Record<string, string | number> = { label: g.label }
    for (const type of ["SALE", "LONG_TERM_RENT", "SHORT_TERM_RENT", "PRE_SALE"]) {
      row[type] = g.items.filter((f) => f.transactionType === type).length
    }
    return row
  })

  // ── Property type breakdown ───────────────────────────────────────────────────
  const propertyTypeData = filesByPropertyType
    .filter((p) => p.propertyType !== null && p._count.id > 0)
    .map((p) => ({
      type: p.propertyType!,
      label: PROPERTY_TYPE_LABELS[p.propertyType!] ?? p.propertyType!,
      count: p._count.id,
    }))

  // ── Avg days to close ─────────────────────────────────────────────────────────
  const daysData = avgDaysRows
    .filter((row) => Number(row.avg_days) > 0)
    .map((row) => ({
      transactionType: row.transactionType,
      label: TX_LABELS[row.transactionType] ?? row.transactionType,
      avgDays: Math.round(Number(row.avg_days)),
    }))

  // ── Sale price trend ─────────────────────────────────────────────────────────
  const priceFiles = salePriceFiles.map((f) => ({
    salePrice: Number(f.salePrice),
    createdAt: f.createdAt,
  }))
  const priceGroups = groupByJalaliMonth(priceFiles, "createdAt")
  const priceTrendData = priceGroups
    .map((g) => ({
      label: g.label,
      avgPrice: g.items.length > 0
        ? Math.round(
            g.items.reduce((acc, f) => acc + f.salePrice, 0) / g.items.length
          )
        : 0,
      count: g.items.length,
    }))
    .filter((p) => p.avgPrice > 0)

  // ── Stale files ──────────────────────────────────────────────────────────────
  const staleData = staleFiles.map((f) => ({
    id: f.id,
    address: f.address,
    neighborhood: f.neighborhood,
    transactionType: f.transactionType as TransactionType,
    createdAt: f.createdAt,
    daysOnMarket: Math.floor(
      (Date.now() - f.createdAt.getTime()) / (1000 * 60 * 60 * 24)
    ),
  }))

  return (
    <div className="space-y-6">
      {/* Period filter */}
      <div className="flex gap-1 overflow-x-auto pb-1">
        {PERIOD_OPTIONS.map((opt) => {
          const href =
            opt.value === "this_year"
              ? "/reports/files"
              : `/reports/files?period=${opt.value}`
          const isActive = activePeriod === opt.value
          return (
            <Link
              key={opt.value}
              href={href}
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

      {/* Top row: status donut + intake chart */}
      <div className="grid gap-4 lg:grid-cols-2">
        <FileStatusDonut data={statusData} total={totalFiles} />
        {intakeData.length > 0 && <FileIntakeChart data={intakeData} />}
      </div>

      {/* Property type + days to close */}
      {(propertyTypeData.length > 0 || daysData.length > 0) && (
        <div className="grid gap-4 lg:grid-cols-2">
          {propertyTypeData.length > 0 && (
            <FilePropertyTypeChart data={propertyTypeData} />
          )}
          {daysData.length > 0 && <FileDaysToCloseChart data={daysData} />}
        </div>
      )}

      {/* Sale price trend — only shown with 2+ data points */}
      {priceTrendData.length >= 2 && <FilePriceTrendChart data={priceTrendData} />}

      {/* Stale files alert — always shown */}
      <StaleFilesTable files={staleData} />
    </div>
  )
}
