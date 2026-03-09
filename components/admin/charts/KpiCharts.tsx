"use client"

import dynamic from "next/dynamic"

const AiUsageChart = dynamic(
  () => import("./AiUsageChart").then((m) => m.AiUsageChart),
  { ssr: false, loading: () => <div className="rounded-xl border-2 border-border bg-card p-5 h-[220px] mt-4 animate-pulse" /> }
)

const ReferralEarningsChart = dynamic(
  () => import("./ReferralEarningsChart").then((m) => m.ReferralEarningsChart),
  { ssr: false, loading: () => <div className="rounded-xl border-2 border-border bg-card p-5 h-[220px] mt-4 animate-pulse" /> }
)

interface AiChartItem {
  month: string
  calls: number
}

interface ReferralChartItem {
  month: string
  commission: number
}

export function KpiAiUsageChart({ data }: { data: AiChartItem[] }) {
  return <AiUsageChart data={data} />
}

export function KpiReferralEarningsChart({ data }: { data: ReferralChartItem[] }) {
  return <ReferralEarningsChart data={data} />
}
