"use client"

import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { formatToman, formatTomanAxis } from "@/lib/utils"

interface VolumeDataPoint {
  label: string
  count: number
  commission: number
}

interface Props {
  data: VolumeDataPoint[]
}

export function ContractVolumeChart({ data }: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>روند حجم معاملات و کمیسیون</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={240}>
          <ComposedChart data={data} margin={{ top: 4, right: 16, left: 8, bottom: 4 }}>
            <CartesianGrid vertical={false} strokeDasharray="3 3" />
            <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
            <YAxis
              yAxisId="commission"
              orientation="right"
              tickLine={false}
              axisLine={false}
              tickFormatter={formatTomanAxis}
              tick={{ fontSize: 10 }}
              width={60}
            />
            <YAxis
              yAxisId="count"
              orientation="left"
              tickLine={false}
              axisLine={false}
              allowDecimals={false}
              tick={{ fontSize: 10 }}
              width={28}
            />
            <Tooltip
              content={({ active, payload, label }) => {
                if (!active || !payload?.length) return null
                const item = payload[0]?.payload as VolumeDataPoint
                return (
                  <div className="rounded-lg border bg-popover p-2.5 text-sm shadow-md space-y-1">
                    <p className="font-semibold">{label}</p>
                    <p className="text-muted-foreground">{item.count.toLocaleString("fa-IR")} قرارداد</p>
                    <p className="text-emerald-600 dark:text-emerald-400">{formatToman(item.commission)}</p>
                  </div>
                )
              }}
            />
            <Bar yAxisId="commission" dataKey="commission" fill="hsl(217, 91%, 60%)" radius={[4, 4, 0, 0]} name="کمیسیون" />
            <Line yAxisId="count" type="monotone" dataKey="count" stroke="hsl(142, 71%, 45%)" strokeWidth={2} dot={{ r: 4, fill: "hsl(142, 71%, 45%)" }} name="تعداد" />
            <Legend
              formatter={(value) => (
                <span className="text-xs">{value === "commission" ? "کمیسیون" : "تعداد قرارداد"}</span>
              )}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
