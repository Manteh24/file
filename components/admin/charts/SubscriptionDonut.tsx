"use client"

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts"

interface SliceItem {
  name: string
  value: number
  color: string
}

interface DonutProps {
  title: string
  data: SliceItem[]
}

function DonutTooltip({ active, payload }: { active?: boolean; payload?: Array<{ name: string; value: number; payload: SliceItem }> }) {
  if (!active || !payload?.length) return null
  const item = payload[0]
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 shadow-md text-start">
      <div className="flex items-center gap-1.5">
        <span className="inline-block w-2 h-2 rounded-full" style={{ background: item.payload.color }} />
        <p className="text-[11px] text-muted-foreground">{item.name}</p>
      </div>
      <p className="text-sm font-bold mt-0.5">{item.value.toLocaleString("fa-IR")}</p>
    </div>
  )
}

function SingleDonut({ title, data }: DonutProps) {
  const total = data.reduce((s, d) => s + d.value, 0)
  return (
    <div className="flex flex-col items-center">
      <p className="text-[11px] text-muted-foreground mb-2 text-center">{title}</p>
      <div className="relative w-[110px] h-[110px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={34}
              outerRadius={50}
              dataKey="value"
              strokeWidth={0}
              paddingAngle={2}
            >
              {data.map((entry) => (
                <Cell key={entry.name} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip content={<DonutTooltip />} />
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-lg font-bold tabular-nums">{total.toLocaleString("fa-IR")}</span>
        </div>
      </div>
      <ul className="mt-3 space-y-1 w-full">
        {data.map((item) => (
          <li key={item.name} className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <span className="inline-block w-2 h-2 rounded-full flex-shrink-0" style={{ background: item.color }} />
              {item.name}
            </span>
            <span className="text-[11px] font-medium tabular-nums">{item.value.toLocaleString("fa-IR")}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

interface SubscriptionDonutProps {
  planData: SliceItem[]
  statusData: SliceItem[]
}

export function SubscriptionDonut({ planData, statusData }: SubscriptionDonutProps) {
  return (
    <div className="rounded-xl border-2 border-border bg-card p-5 h-full">
      <p className="text-[13px] text-muted-foreground mb-4">توزیع اشتراک‌ها</p>
      <div className="flex justify-around gap-4">
        <SingleDonut title="بر اساس پلن" data={planData} />
        <SingleDonut title="بر اساس وضعیت" data={statusData} />
      </div>
    </div>
  )
}
