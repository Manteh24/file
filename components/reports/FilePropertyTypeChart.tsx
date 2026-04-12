"use client"

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  LabelList,
} from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface PropertyTypeData {
  type: string
  label: string
  count: number
}

interface Props {
  data: PropertyTypeData[]
}

export function FilePropertyTypeChart({ data }: Props) {
  const chartHeight = Math.min(Math.max(160, data.length * 44), 360)

  return (
    <Card>
      <CardHeader>
        <CardTitle>ترکیب انواع ملک</CardTitle>
      </CardHeader>
      <CardContent style={{ height: chartHeight }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 4, right: 40, left: 0, bottom: 4 }}
          >
            <XAxis
              type="number"
              tickLine={false}
              axisLine={false}
              allowDecimals={false}
              tick={{ fontSize: 10 }}
            />
            <YAxis
              type="category"
              dataKey="label"
              width={64}
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 11 }}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null
                const item = payload[0].payload as PropertyTypeData
                return (
                  <div className="rounded-lg border bg-popover p-2 text-sm shadow-md">
                    <p className="font-medium">{item.label}</p>
                    <p className="text-muted-foreground">
                      {item.count.toLocaleString("fa-IR")} فایل
                    </p>
                  </div>
                )
              }}
            />
            <Bar dataKey="count" fill="hsl(262, 80%, 65%)" radius={[0, 4, 4, 0]}>
              <LabelList
                dataKey="count"
                position="right"
                formatter={(v: unknown) => Number(v).toLocaleString("fa-IR")}
                style={{ fontSize: 10 }}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
