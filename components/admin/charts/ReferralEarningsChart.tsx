"use client"

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { formatToman } from "@/lib/utils"

interface DataPoint {
  month: string
  commission: number
}

interface ReferralEarningsChartProps {
  data: DataPoint[]
}

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number }>; label?: string }) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 shadow-md text-start">
      <p className="text-[11px] text-muted-foreground mb-0.5">{label}</p>
      <p className="text-sm font-bold" style={{ color: "#a78bfa" }}>
        {formatToman(payload[0]?.value ?? 0)}
      </p>
    </div>
  )
}

export function ReferralEarningsChart({ data }: ReferralEarningsChartProps) {
  if (!data.length) return null
  return (
    <div className="rounded-xl border-2 border-border bg-card p-5 mt-4">
      <p className="text-[13px] text-muted-foreground mb-4">کمیسیون ارجاع ماهانه — ۶ ماه اخیر</p>
      <ResponsiveContainer width="100%" height={160}>
        <BarChart data={data} margin={{ top: 5, right: 4, left: 0, bottom: 0 }} barSize={28}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
          <XAxis
            dataKey="month"
            tick={{ fontSize: 11, fontFamily: "var(--font-vazirmatn)", fill: "var(--muted-foreground)" }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            tick={{ fontSize: 11, fontFamily: "var(--font-vazirmatn)", fill: "var(--muted-foreground)" }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v: number) =>
              v >= 1_000_000
                ? `${(v / 1_000_000).toLocaleString("fa-IR", { maximumFractionDigits: 1 })}M`
                : v >= 1000
                ? `${(v / 1000).toLocaleString("fa-IR", { maximumFractionDigits: 0 })}K`
                : v.toLocaleString("fa-IR")
            }
            width={40}
            allowDecimals={false}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: "var(--muted)", opacity: 0.5 }} />
          <Bar dataKey="commission" fill="#a78bfa" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
