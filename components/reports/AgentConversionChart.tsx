"use client"

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  LabelList,
  Cell,
} from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface AgentConversionData {
  userId: string
  displayName: string
  closed: number
  total: number
  rate: number
}

interface Props {
  data: AgentConversionData[]
  avgRate: number
}

export function AgentConversionChart({ data, avgRate }: Props) {
  const chartHeight = Math.min(Math.max(160, data.length * 52), 400)

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>نرخ تبدیل فایل به معامله</CardTitle>
          <span className="text-xs text-muted-foreground">
            میانگین: {avgRate.toLocaleString("fa-IR")}٪
          </span>
        </div>
      </CardHeader>
      <CardContent style={{ height: data.length === 0 ? 100 : chartHeight }}>
        {data.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <p className="text-sm text-muted-foreground">داده‌ای موجود نیست</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              layout="vertical"
              margin={{ top: 4, right: 52, left: 0, bottom: 4 }}
            >
              <XAxis
                type="number"
                domain={[0, 100]}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => `${v}٪`}
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
              {avgRate > 0 && (
                <ReferenceLine
                  x={avgRate}
                  stroke="hsl(38, 92%, 50%)"
                  strokeDasharray="4 4"
                  label={{
                    value: "میانگین",
                    position: "top",
                    fontSize: 9,
                    fill: "hsl(38, 92%, 50%)",
                  }}
                />
              )}
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null
                  const item = payload[0].payload as AgentConversionData
                  return (
                    <div className="rounded-lg border bg-popover p-2.5 text-sm shadow-md space-y-1">
                      <p className="font-semibold">{item.displayName}</p>
                      <p className="text-muted-foreground">
                        {item.closed.toLocaleString("fa-IR")} از{" "}
                        {item.total.toLocaleString("fa-IR")} فایل به معامله رسید
                      </p>
                      <p className="font-medium">
                        {item.rate.toLocaleString("fa-IR")}٪ نرخ تبدیل
                      </p>
                    </div>
                  )
                }}
              />
              <Bar dataKey="rate" radius={[0, 4, 4, 0]}>
                {data.map((entry) => (
                  <Cell
                    key={entry.userId}
                    fill={
                      entry.rate >= avgRate
                        ? "hsl(142, 71%, 45%)"
                        : "hsl(38, 92%, 50%)"
                    }
                  />
                ))}
                <LabelList
                  dataKey="rate"
                  position="right"
                  formatter={(v: unknown) =>
                    `${Number(v).toLocaleString("fa-IR")}٪`
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
