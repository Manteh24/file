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

interface AgentData {
  displayName: string
  commissionAmount: number
  deals: number
}

interface Props {
  data: AgentData[]
}

export function AgentCommissionBarChart({ data }: Props) {
  const chartHeight = Math.min(Math.max(160, data.length * 52), 400)

  return (
    <Card>
      <CardHeader>
        <CardTitle>کمیسیون کل مشاوران</CardTitle>
      </CardHeader>
      <CardContent style={{ height: data.length === 0 ? 100 : chartHeight }}>
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
              margin={{ top: 4, right: 4, left: 0, bottom: 4 }}
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
                width={72}
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 11 }}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null
                  const item = payload[0].payload as AgentData
                  return (
                    <div className="rounded-lg border bg-popover p-2.5 text-sm shadow-md space-y-1">
                      <p className="font-medium">{item.displayName}</p>
                      <p className="text-muted-foreground">
                        {item.deals.toLocaleString("fa-IR")} معامله
                      </p>
                      <p className="text-emerald-600 dark:text-emerald-400">
                        {formatToman(item.commissionAmount)}
                      </p>
                    </div>
                  )
                }}
              />
              <Bar
                dataKey="commissionAmount"
                fill="hsl(217, 91%, 60%)"
                radius={[0, 4, 4, 0]}
              >
                <LabelList
                  dataKey="deals"
                  position="right"
                  formatter={(v: unknown) =>
                    v != null ? `${Number(v).toLocaleString("fa-IR")} معامله` : ""
                  }
                  style={{ fontSize: 10 }}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  )
}
