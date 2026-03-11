"use client"

import { BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import { formatTomanAxis, formatToman } from "@/lib/utils"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export interface MonthlyDataPoint {
  label: string
  commission: number
  deals: number
}

interface Props {
  data: MonthlyDataPoint[]
}

const chartConfig = {
  commission: { label: "کمیسیون", color: "hsl(var(--primary))" },
}

export function CommissionChart({ data }: Props) {
  if (data.length === 0) return null

  return (
    <Card>
      <CardHeader>
        <CardTitle>روند کمیسیون</CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-52 w-full">
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
              dataKey="commission"
              fill="var(--color-commission)"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
