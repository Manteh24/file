"use client"

import { BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from "@/components/ui/chart"
import { formatTomanAxis, formatToman } from "@/lib/utils"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export interface MonthlyDataPoint {
  label: string
  officeShare: number
  agentShare: number
  deals: number
}

interface Props {
  data: MonthlyDataPoint[]
}

const chartConfig = {
  officeShare: { label: "سهم دفتر", color: "hsl(217, 91%, 60%)" },
  agentShare: { label: "سهم مشاور", color: "hsl(142, 71%, 45%)" },
}

export function CommissionChart({ data }: Props) {
  if (data.length === 0) return null

  return (
    <Card>
      <CardHeader>
        <CardTitle>روند کمیسیون</CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="w-full" style={{ height: 208 }}>
          <BarChart data={data} margin={{ top: 4, right: 4, left: 8, bottom: 4 }}>
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
              tickFormatter={formatTomanAxis}
              tick={{ fontSize: 11 }}
              width={55}
            />
            <ChartTooltip
              content={({ active, payload, label }) => (
                <ChartTooltipContent
                  active={active}
                  payload={payload}
                  label={label}
                  formatter={(value) => formatToman(value as number)}
                  labelFormatter={(_, p) => {
                    const deals =
                      (p?.[0]?.payload as MonthlyDataPoint | undefined)
                        ?.deals ?? 0
                    return `${_} · ${deals.toLocaleString("fa-IR")} معامله`
                  }}
                />
              )}
            />
            <Bar
              dataKey="officeShare"
              stackId="a"
              fill="var(--color-officeShare)"
              radius={[0, 0, 0, 0]}
            />
            <Bar
              dataKey="agentShare"
              stackId="a"
              fill="var(--color-agentShare)"
              radius={[4, 4, 0, 0]}
            />
            <ChartLegend content={(props) => <ChartLegendContent payload={props.payload} />} />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
