"use client"

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
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

interface AgentData {
  displayName: string
  byType: Record<string, number>
}

interface Props {
  data: AgentData[]
}

export function AgentDealTypesChart({ data }: Props) {
  const chartData = data.map((a) => ({
    displayName: a.displayName,
    ...Object.fromEntries(TYPES.map((t) => [t, a.byType[t] ?? 0])),
  }))
  const chartHeight = Math.min(Math.max(160, data.length * 52), 400)

  return (
    <Card>
      <CardHeader>
        <CardTitle>ترکیب معاملات هر مشاور</CardTitle>
      </CardHeader>
      <CardContent style={{ height: data.length === 0 ? 100 : chartHeight }}>
        {data.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <p className="text-sm text-muted-foreground">هیچ معامله‌ای ثبت نشده</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              layout="vertical"
              margin={{ top: 4, right: 8, left: 0, bottom: 4 }}
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
                  const name = String(
                    (payload[0]?.payload as { displayName: string } | undefined)?.displayName ?? ""
                  )
                  return (
                    <div className="rounded-lg border bg-popover p-2.5 text-sm shadow-md space-y-1">
                      <p className="font-semibold">{name}</p>
                      {payload.map((p) =>
                        Number(p.value) > 0 ? (
                          <p
                            key={String(p.dataKey)}
                            style={{ color: String(p.fill) }}
                            className="text-xs"
                          >
                            {TYPE_LABELS[String(p.dataKey)] ?? String(p.dataKey)}:{" "}
                            {Number(p.value).toLocaleString("fa-IR")}
                          </p>
                        ) : null
                      )}
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
                  radius={i === TYPES.length - 1 ? [0, 4, 4, 0] : [0, 0, 0, 0]}
                  name={TYPE_LABELS[type]}
                />
              ))}
              <Legend
                formatter={(v) => (
                  <span className="text-xs">{TYPE_LABELS[v] ?? v}</span>
                )}
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  )
}
