"use client"

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { formatToman, formatTomanAxis } from "@/lib/utils"

interface PriceTrendPoint {
  label: string
  avgPrice: number
  count: number
}

interface Props {
  data: PriceTrendPoint[]
}

export function FilePriceTrendChart({ data }: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>روند میانگین قیمت فروش</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={data} margin={{ top: 4, right: 8, left: 8, bottom: 4 }}>
            <defs>
              <linearGradient id="priceGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(217, 91%, 60%)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(217, 91%, 60%)" stopOpacity={0} />
              </linearGradient>
            </defs>
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
              tickFormatter={formatTomanAxis}
              tick={{ fontSize: 10 }}
              width={60}
            />
            <Tooltip
              content={({ active, payload, label }) => {
                if (!active || !payload?.length) return null
                const item = payload[0].payload as PriceTrendPoint
                return (
                  <div className="rounded-lg border bg-popover p-2.5 text-sm shadow-md space-y-1">
                    <p className="font-semibold">{label}</p>
                    <p className="text-muted-foreground">
                      میانگین: {formatToman(item.avgPrice)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {item.count.toLocaleString("fa-IR")} فایل
                    </p>
                  </div>
                )
              }}
            />
            <Area
              type="monotone"
              dataKey="avgPrice"
              stroke="hsl(217, 91%, 60%)"
              strokeWidth={2}
              fill="url(#priceGrad)"
              dot={{ r: 3, fill: "hsl(217, 91%, 60%)" }}
              activeDot={{ r: 5 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
