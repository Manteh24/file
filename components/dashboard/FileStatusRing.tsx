"use client"

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Label } from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  ACTIVE: { label: "فعال", color: "hsl(217, 91%, 60%)" },
  SOLD: { label: "فروخته‌شده", color: "hsl(142, 71%, 45%)" },
  RENTED: { label: "اجاره‌رفته", color: "hsl(173, 58%, 39%)" },
  ARCHIVED: { label: "بایگانی", color: "hsl(215, 16%, 57%)" },
  EXPIRED: { label: "منقضی", color: "hsl(0, 72%, 51%)" },
}

interface StatusDataItem {
  status: string
  count: number
}

interface Props {
  data: StatusDataItem[]
}

export function FileStatusRing({ data }: Props) {
  const totalFiles = data.reduce((acc, d) => acc + d.count, 0)

  const chartData = data.map((d) => ({
    ...d,
    label: STATUS_CONFIG[d.status]?.label ?? d.status,
    color: STATUS_CONFIG[d.status]?.color ?? "hsl(215, 16%, 57%)",
  }))

  return (
    <Card>
      <CardHeader>
        <CardTitle>وضعیت فایل‌ها</CardTitle>
      </CardHeader>
      <CardContent style={{ height: 220 }}>
        {data.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <p className="text-sm text-muted-foreground">فایلی ثبت نشده</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                dataKey="count"
                nameKey="label"
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={75}
                paddingAngle={2}
              >
                {chartData.map((entry) => (
                  <Cell key={entry.status} fill={entry.color} />
                ))}
                <Label
                  content={({ viewBox }) => {
                    if (!viewBox || !("cx" in viewBox) || !("cy" in viewBox)) return null
                    const cx = viewBox.cx ?? 0
                    const cy = viewBox.cy ?? 0
                    return (
                      <text textAnchor="middle">
                        <tspan
                          x={cx}
                          y={cy - 6}
                          style={{ fontSize: 20, fontWeight: 700, fill: "var(--foreground)" }}
                        >
                          {totalFiles.toLocaleString("fa-IR")}
                        </tspan>
                        <tspan
                          x={cx}
                          y={cy + 13}
                          style={{ fontSize: 11, fill: "var(--muted-foreground, #888)" }}
                        >
                          فایل
                        </tspan>
                      </text>
                    )
                  }}
                />
              </Pie>
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null
                  const item = payload[0].payload as (typeof chartData)[number]
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
            </PieChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  )
}
