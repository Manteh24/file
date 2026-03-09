"use client"

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

interface DataPoint {
  month: string
  signups: number
}

interface GrowthTrendChartProps {
  data: DataPoint[]
}

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number }>; label?: string }) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 shadow-md text-start">
      <p className="text-[11px] text-muted-foreground mb-0.5">{label}</p>
      <p className="text-sm font-bold" style={{ color: "#4ade80" }}>
        {payload[0]?.value?.toLocaleString("fa-IR")} دفتر
      </p>
    </div>
  )
}

export function GrowthTrendChart({ data }: GrowthTrendChartProps) {
  return (
    <div className="rounded-xl border-2 border-border bg-card p-5 h-full">
      <p className="text-[13px] text-muted-foreground mb-4">ثبت‌نام‌های ماهانه — ۱۲ ماه اخیر</p>
      <ResponsiveContainer width="100%" height={190}>
        <AreaChart data={data} margin={{ top: 5, right: 4, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="gradSignups" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#4ade80" stopOpacity={0.25} />
              <stop offset="95%" stopColor="#4ade80" stopOpacity={0} />
            </linearGradient>
          </defs>
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
            tickFormatter={(v: number) => v.toLocaleString("fa-IR")}
            width={32}
            allowDecimals={false}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ stroke: "var(--border)", strokeWidth: 1 }} />
          <Area
            type="monotone"
            dataKey="signups"
            stroke="#4ade80"
            strokeWidth={2}
            fill="url(#gradSignups)"
            dot={false}
            activeDot={{ r: 4, fill: "#4ade80", strokeWidth: 0 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
