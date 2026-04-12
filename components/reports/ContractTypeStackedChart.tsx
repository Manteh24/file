"use client"

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

const TYPE_COLORS: Record<string, string> = {
  SALE: "hsl(217, 91%, 60%)",
  LONG_TERM_RENT: "hsl(142, 71%, 45%)",
  PRE_SALE: "hsl(262, 80%, 65%)",
  SHORT_TERM_RENT: "hsl(38, 92%, 50%)",
}

const TYPE_LABELS: Record<string, string> = {
  SALE: "فروش",
  LONG_TERM_RENT: "اجاره بلندمدت",
  PRE_SALE: "پیش‌فروش",
  SHORT_TERM_RENT: "اجاره کوتاه‌مدت",
}

const TYPES = ["SALE", "LONG_TERM_RENT", "PRE_SALE", "SHORT_TERM_RENT"]

interface Props {
  data: Record<string, string | number>[]
}

export function ContractTypeStackedChart({ data }: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>ترکیب انواع معاملات در طول زمان</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 4 }}>
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
              allowDecimals={false}
              tick={{ fontSize: 10 }}
              width={24}
            />
            <Tooltip
              content={({ active, payload, label }) => {
                if (!active || !payload?.length) return null
                const total = payload.reduce((acc, p) => acc + (Number(p.value) || 0), 0)
                return (
                  <div className="rounded-lg border bg-popover p-2.5 text-sm shadow-md space-y-1">
                    <p className="font-semibold">{label}</p>
                    {payload.map((p) =>
                      Number(p.value) > 0 ? (
                        <p key={String(p.dataKey)} style={{ color: String(p.fill) }} className="text-xs">
                          {TYPE_LABELS[String(p.dataKey)] ?? String(p.dataKey)}:{" "}
                          {Number(p.value).toLocaleString("fa-IR")}
                          {total > 0 &&
                            ` (${Math.round((Number(p.value) / total) * 100)}٪)`}
                        </p>
                      ) : null
                    )}
                    <p className="text-xs text-muted-foreground border-t pt-1">
                      جمع: {total.toLocaleString("fa-IR")}
                    </p>
                  </div>
                )
              }}
            />
            {TYPES.map((type, i) => (
              <Bar
                key={type}
                dataKey={type}
                stackId="a"
                fill={TYPE_COLORS[type]}
                radius={i === TYPES.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]}
                name={TYPE_LABELS[type]}
              />
            ))}
            <Legend
              formatter={(value) => (
                <span className="text-xs">{TYPE_LABELS[value] ?? value}</span>
              )}
            />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
