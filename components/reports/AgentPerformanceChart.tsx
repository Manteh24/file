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
import { formatToman, formatTomanAxis } from "@/lib/utils"

interface AgentDataItem {
  displayName: string
  deals: number
  agentShare: number
}

interface Props {
  data: AgentDataItem[]
}

export function AgentPerformanceChart({ data }: Props) {
  const chartHeight = Math.min(Math.max(180, data.length * 52), 400)

  return (
    <Card>
      <CardHeader>
        <CardTitle>عملکرد مشاوران</CardTitle>
      </CardHeader>
      <CardContent>
        <div style={{ height: data.length === 0 ? 100 : chartHeight }}>
        {data.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <p className="text-sm text-muted-foreground">
              هیچ معامله‌ای در این بازه ثبت نشده
            </p>
          </div>
        ) : (
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
                tickFormatter={formatTomanAxis}
                tick={{ fontSize: 10 }}
              />
              <YAxis
                type="category"
                dataKey="displayName"
                width={70}
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 11 }}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null
                  const item = payload[0].payload as AgentDataItem
                  return (
                    <div className="rounded-lg border bg-popover p-2 text-sm shadow-md">
                      <p className="mb-1 font-medium">{item.displayName}</p>
                      <p className="text-muted-foreground">
                        {item.deals.toLocaleString("fa-IR")} معامله
                      </p>
                      <p className="text-muted-foreground">{formatToman(item.agentShare)}</p>
                    </div>
                  )
                }}
              />
              <Bar
                dataKey="agentShare"
                fill="#14b8a6"
                radius={[0, 4, 4, 0]}
              >
                <LabelList
                  dataKey="deals"
                  position="right"
                  formatter={(v) => v != null ? Number(v).toLocaleString("fa-IR") : ""}
                  style={{ fontSize: 11 }}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
        </div>
      </CardContent>
    </Card>
  )
}
