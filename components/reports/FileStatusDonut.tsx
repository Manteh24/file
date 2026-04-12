"use client"

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Label } from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: "hsl(217, 91%, 60%)",
  SOLD: "hsl(142, 71%, 45%)",
  RENTED: "hsl(186, 75%, 45%)",
  ARCHIVED: "hsl(215, 16%, 57%)",
  EXPIRED: "hsl(38, 92%, 50%)",
}

interface StatusDataItem {
  status: string
  label: string
  count: number
}

interface Props {
  data: StatusDataItem[]
  total: number
}

export function FileStatusDonut({ data, total }: Props) {
  const visible = data.filter((d) => d.count > 0)

  return (
    <Card>
      <CardHeader>
        <CardTitle>وضعیت پورتفولیو فایل‌ها</CardTitle>
      </CardHeader>
      <CardContent>
        {visible.length === 0 ? (
          <div className="flex h-32 items-center justify-center">
            <p className="text-sm text-muted-foreground">هیچ فایلی ثبت نشده</p>
          </div>
        ) : (
          <div className="flex items-center gap-6">
            {/* Donut */}
            <div style={{ width: 180, height: 180, flexShrink: 0 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={visible}
                    dataKey="count"
                    nameKey="label"
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={2}
                  >
                    {visible.map((entry) => (
                      <Cell
                        key={entry.status}
                        fill={STATUS_COLORS[entry.status] ?? "hsl(215,16%,57%)"}
                      />
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
                              style={{ fontSize: 22, fontWeight: 700 }}
                            >
                              {total.toLocaleString("fa-IR")}
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
                      const item = payload[0].payload as StatusDataItem
                      return (
                        <div className="rounded-lg border bg-popover p-2 text-sm shadow-md space-y-0.5">
                          <p className="font-medium">{item.label}</p>
                          <p className="text-muted-foreground">
                            {item.count.toLocaleString("fa-IR")} فایل
                          </p>
                          <p className="text-muted-foreground">
                            {total > 0
                              ? Math.round((item.count / total) * 100).toLocaleString("fa-IR")
                              : 0}
                            ٪
                          </p>
                        </div>
                      )
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Legend */}
            <div className="space-y-2.5 flex-1">
              {visible.map((item) => (
                <div
                  key={item.status}
                  className="flex items-center justify-between text-sm"
                >
                  <div className="flex items-center gap-2">
                    <div
                      className="h-2.5 w-2.5 rounded-full shrink-0"
                      style={{
                        backgroundColor:
                          STATUS_COLORS[item.status] ?? "hsl(215,16%,57%)",
                      }}
                    />
                    <span className="text-muted-foreground">{item.label}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">
                      {item.count.toLocaleString("fa-IR")}
                    </span>
                    <span className="text-xs text-muted-foreground w-8 text-end">
                      {total > 0
                        ? `${Math.round((item.count / total) * 100)}٪`
                        : ""}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
