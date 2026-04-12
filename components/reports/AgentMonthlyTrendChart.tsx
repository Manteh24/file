"use client"

import { useState } from "react"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { formatToman, formatTomanAxis } from "@/lib/utils"

const AGENT_COLORS = [
  "hsl(217, 91%, 60%)",
  "hsl(142, 71%, 45%)",
  "hsl(262, 80%, 65%)",
  "hsl(38, 92%, 50%)",
  "hsl(338, 75%, 55%)",
  "hsl(186, 75%, 45%)",
  "hsl(24, 90%, 55%)",
  "hsl(100, 60%, 45%)",
]

interface AgentMeta {
  userId: string
  displayName: string
}

interface Props {
  data: Record<string, string | number>[]
  agents: AgentMeta[]
}

export function AgentMonthlyTrendChart({ data, agents }: Props) {
  const [mode, setMode] = useState<"count" | "commission">("count")

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle>روند ماهانه مشاوران</CardTitle>
          <div className="flex gap-1">
            <Button
              size="sm"
              variant={mode === "count" ? "default" : "outline"}
              className="h-7 text-xs"
              onClick={() => setMode("count")}
            >
              تعداد قرارداد
            </Button>
            <Button
              size="sm"
              variant={mode === "commission" ? "default" : "outline"}
              className="h-7 text-xs"
              onClick={() => setMode("commission")}
            >
              کمیسیون
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={240}>
          <LineChart data={data} margin={{ top: 4, right: 8, left: 8, bottom: 4 }}>
            <CartesianGrid vertical={false} strokeDasharray="3 3" />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 11 }}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 10 }}
              width={mode === "commission" ? 60 : 28}
              tickFormatter={mode === "commission" ? formatTomanAxis : undefined}
              allowDecimals={false}
            />
            <Tooltip
              content={({ active, payload, label }) => {
                if (!active || !payload?.length) return null
                const visible = payload.filter((p) => Number(p.value) > 0)
                if (!visible.length) return null
                return (
                  <div className="rounded-lg border bg-popover p-2.5 text-sm shadow-md space-y-1 min-w-[140px]">
                    <p className="font-semibold">{label}</p>
                    {visible.map((p) => (
                      <p key={String(p.dataKey)} style={{ color: p.stroke }} className="text-xs">
                        {String(p.name)}:{" "}
                        {mode === "commission"
                          ? formatToman(Number(p.value))
                          : `${Number(p.value).toLocaleString("fa-IR")} قرارداد`}
                      </p>
                    ))}
                  </div>
                )
              }}
            />
            {agents.map((agent, i) => (
              <Line
                key={agent.userId}
                type="monotone"
                dataKey={`${agent.userId}_${mode}`}
                stroke={AGENT_COLORS[i % AGENT_COLORS.length]}
                strokeWidth={2}
                dot={{ r: 3, fill: AGENT_COLORS[i % AGENT_COLORS.length] }}
                activeDot={{ r: 5 }}
                name={agent.displayName}
                connectNulls
              />
            ))}
            <Legend
              formatter={(value) => <span className="text-xs">{value}</span>}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
