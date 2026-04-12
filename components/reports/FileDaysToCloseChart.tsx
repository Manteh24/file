"use client"

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  LabelList,
  ReferenceLine,
} from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface DaysData {
  transactionType: string
  label: string
  avgDays: number
}

interface Props {
  data: DaysData[]
}

export function FileDaysToCloseChart({ data }: Props) {
  const chartHeight = Math.max(160, data.length * 56)

  return (
    <Card>
      <CardHeader>
        <CardTitle>میانگین روز تا معامله</CardTitle>
      </CardHeader>
      <CardContent style={{ height: chartHeight }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 4, right: 60, left: 0, bottom: 4 }}
          >
            <XAxis
              type="number"
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 10 }}
              tickFormatter={(v) => `${v}`}
            />
            <YAxis
              type="category"
              dataKey="label"
              width={95}
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 11 }}
            />
            <ReferenceLine
              x={30}
              stroke="hsl(38, 92%, 50%)"
              strokeDasharray="4 4"
              label={{
                value: "۳۰ روز",
                position: "top",
                fontSize: 9,
                fill: "hsl(38, 92%, 50%)",
              }}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null
                const item = payload[0].payload as DaysData
                return (
                  <div className="rounded-lg border bg-popover p-2 text-sm shadow-md">
                    <p className="font-medium">{item.label}</p>
                    <p className="text-muted-foreground">
                      میانگین {item.avgDays.toLocaleString("fa-IR")} روز
                    </p>
                  </div>
                )
              }}
            />
            <Bar dataKey="avgDays" fill="hsl(186, 75%, 45%)" radius={[0, 4, 4, 0]}>
              <LabelList
                dataKey="avgDays"
                position="right"
                formatter={(v: unknown) =>
                  `${Number(v).toLocaleString("fa-IR")} روز`
                }
                style={{ fontSize: 10 }}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
