"use client"

import dynamic from "next/dynamic"
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts"

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

const BILLING_COLORS = { annual: "#a78bfa", monthly: "#60a5fa" }

interface BillingTooltipProps {
  active?: boolean
  payload?: Array<{ name: string; value: number; payload: { color: string } }>
}

function BillingTooltip({ active, payload }: BillingTooltipProps) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 shadow-md text-start">
      <div className="flex items-center gap-1.5">
        <span className="inline-block w-2 h-2 rounded-full" style={{ background: payload[0].payload.color }} />
        <p className="text-[11px] text-muted-foreground">{payload[0].name}</p>
      </div>
      <p className="text-sm font-bold mt-0.5">{payload[0].value.toLocaleString("fa-IR")}</p>
    </div>
  )
}

export function BillingCycleDonut({ annual, monthly }: { annual: number; monthly: number }) {
  const total = annual + monthly
  if (total === 0) return null

  const data = [
    { name: "سالانه", value: annual, color: BILLING_COLORS.annual },
    { name: "ماهانه", value: monthly, color: BILLING_COLORS.monthly },
  ]

  return (
    <div className="rounded-xl border-2 border-border bg-card p-5 mt-4">
      <p className="text-[13px] text-muted-foreground mb-4">توزیع چرخه صورتحساب</p>
      <div className="flex items-center gap-8">
        <div className="relative w-[120px] h-[120px] flex-shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={data} cx="50%" cy="50%" innerRadius={38} outerRadius={54} dataKey="value" strokeWidth={0} paddingAngle={3}>
                {data.map((entry) => (
                  <Cell key={entry.name} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip content={<BillingTooltip />} />
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="text-lg font-bold tabular-nums">{total.toLocaleString("fa-IR")}</span>
            <span className="text-[10px] text-muted-foreground">اشتراک</span>
          </div>
        </div>
        <div className="space-y-3 flex-1">
          {data.map((item) => (
            <div key={item.name}>
              <div className="flex items-center justify-between mb-1">
                <span className="flex items-center gap-1.5 text-[12px] text-muted-foreground">
                  <span className="inline-block w-2 h-2 rounded-full" style={{ background: item.color }} />
                  {item.name}
                </span>
                <span className="text-[12px] font-semibold tabular-nums">{item.value.toLocaleString("fa-IR")}</span>
              </div>
              <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${Math.round((item.value / total) * 100)}%`, background: item.color }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
