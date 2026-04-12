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

interface PipelineData {
  userId: string
  displayName: string
  activeFiles: number
}

interface Props {
  data: PipelineData[]
}

export function AgentPipelineChart({ data }: Props) {
  const chartHeight = Math.min(Math.max(160, data.length * 52), 400)

  return (
    <Card>
      <CardHeader>
        <CardTitle>فایل‌های فعال هر مشاور</CardTitle>
      </CardHeader>
      <CardContent style={{ height: chartHeight }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 4, right: 36, left: 0, bottom: 4 }}
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
              dataKey="displayName"
              width={72}
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 11 }}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null
                const item = payload[0].payload as PipelineData
                return (
                  <div className="rounded-lg border bg-popover p-2.5 text-sm shadow-md">
                    <p className="font-medium">{item.displayName}</p>
                    <p className="text-muted-foreground">
                      {item.activeFiles.toLocaleString("fa-IR")} فایل فعال
                    </p>
                  </div>
                )
              }}
            />
            <Bar dataKey="activeFiles" fill="hsl(262, 80%, 65%)" radius={[0, 4, 4, 0]}>
              <LabelList
                dataKey="activeFiles"
                position="right"
                formatter={(v: unknown) => Number(v).toLocaleString("fa-IR")}
                style={{ fontSize: 11 }}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
