"use client"

import dynamic from "next/dynamic"

const GrowthTrendChart = dynamic(
  () => import("./GrowthTrendChart").then((m) => m.GrowthTrendChart),
  { ssr: false, loading: () => <div className="rounded-xl border-2 border-border bg-card p-5 h-[258px] animate-pulse" /> }
)

const SubscriptionDonut = dynamic(
  () => import("./SubscriptionDonut").then((m) => m.SubscriptionDonut),
  { ssr: false, loading: () => <div className="rounded-xl border-2 border-border bg-card p-5 h-[258px] animate-pulse" /> }
)

interface SliceItem {
  name: string
  value: number
  color: string
}

interface DashboardChartsProps {
  growthData: { month: string; signups: number }[]
  planData: SliceItem[]
  statusData: SliceItem[]
}

export function DashboardCharts({ growthData, planData, statusData }: DashboardChartsProps) {
  return (
    <div className="grid grid-cols-3 gap-4">
      <div className="col-span-2">
        <GrowthTrendChart data={growthData} />
      </div>
      <div>
        <SubscriptionDonut planData={planData} statusData={statusData} />
      </div>
    </div>
  )
}
