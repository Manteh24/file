"use client"

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Label } from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { formatToman } from "@/lib/utils"

const TYPE_COLORS: Record<string, string> = {
  SALE: "hsl(217, 91%, 60%)",
  LONG_TERM_RENT: "hsl(142, 71%, 45%)",
  PRE_SALE: "hsl(262, 80%, 65%)",
  SHORT_TERM_RENT: "hsl(38, 92%, 50%)",
}

interface TypeDataItem {
  type: string
  label: string
  count: number
  commission: bigint
}

interface Props {
  data: TypeDataItem[]
}

export function TypeBreakdownChart({ data }: Props) {
  const totalDeals = data.reduce((acc, d) => acc + d.count, 0)

  return (
    <Card>
      <CardHeader>
        <CardTitle>بر اساس نوع معامله</CardTitle>
      </CardHeader>
      <CardContent>
        <div style={{ height: 260 }}>
        {data.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <p className="text-sm text-muted-foreground">
              هیچ معامله‌ای در این بازه ثبت نشده
            </p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                dataKey="count"
                nameKey="label"
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={90}
                paddingAngle={2}
              >
                {data.map((entry) => (
                  <Cell
                    key={entry.type}
                    fill={TYPE_COLORS[entry.type] ?? "hsl(215, 16%, 57%)"}
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
                          {totalDeals.toLocaleString("fa-IR")}
                        </tspan>
                        <tspan
                          x={cx}
                          y={cy + 14}
                          style={{ fontSize: 12, fill: "var(--muted-foreground, #888)" }}
                        >
                          معامله
                        </tspan>
                      </text>
                    )
                  }}
                />
              </Pie>
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null
                  const item = payload[0].payload as TypeDataItem
                  return (
                    <div className="rounded-lg border bg-popover p-2 text-sm shadow-md">
                      <p className="mb-1 font-medium">{item.label}</p>
                      <p className="text-muted-foreground">
                        {item.count.toLocaleString("fa-IR")} معامله
                      </p>
                      <p className="text-muted-foreground">{formatToman(item.commission)}</p>
                    </div>
                  )
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        )}
        </div>
      </CardContent>
    </Card>
  )
}
