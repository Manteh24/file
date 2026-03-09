"use client"

import { Area, AreaChart, ResponsiveContainer } from "recharts"

interface SparklineStatsCardProps {
  label: string
  value: string | number
  subLabel?: string
  accent?: "default" | "green" | "amber" | "red"
  sparkline?: number[]
}

const accentClasses = {
  default: "border-border",
  green: "border-green-400",
  amber: "border-amber-400",
  red: "border-red-400",
}

const sparklineColors = {
  default: "#60a5fa",
  green: "#4ade80",
  amber: "#fbbf24",
  red: "#f87171",
}

export function SparklineStatsCard({
  label,
  value,
  subLabel,
  accent = "default",
  sparkline,
}: SparklineStatsCardProps) {
  const color = sparklineColors[accent]
  const data = sparkline?.map((v) => ({ v }))
  const gradId = `sk-${accent}`

  const trend =
    data && data.length >= 2
      ? (data[data.length - 1].v ?? 0) - (data[0].v ?? 0)
      : 0

  return (
    <div className={`rounded-xl border-2 bg-card p-5 ${accentClasses[accent]}`}>
      <p className="text-[13px] text-muted-foreground mb-1">{label}</p>
      <div className="flex items-baseline gap-2">
        <p className="text-2xl font-bold tabular-nums">{value}</p>
        {data && trend !== 0 && (
          <span
            className="text-xs font-medium"
            style={{ color: trend > 0 ? "#4ade80" : "#f87171" }}
          >
            {trend > 0 ? "↑" : "↓"}
          </span>
        )}
      </div>
      {subLabel && <p className="text-xs text-muted-foreground mt-1">{subLabel}</p>}
      {data && data.length > 1 && (
        <div className="mt-3 -mx-1">
          <ResponsiveContainer width="100%" height={38}>
            <AreaChart data={data} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={color} stopOpacity={0.2} />
                  <stop offset="95%" stopColor={color} stopOpacity={0} />
                </linearGradient>
              </defs>
              <Area
                type="monotone"
                dataKey="v"
                stroke={color}
                strokeWidth={1.5}
                fill={`url(#${gradId})`}
                dot={false}
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}
