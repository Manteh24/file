import { StatsCard } from "@/components/admin/StatsCard"

interface KpiItem {
  label: string
  value: string | number
  subLabel?: string
  accent?: "default" | "green" | "amber" | "red"
}

interface KpiGroupProps {
  title: string
  items: KpiItem[]
}

export function KpiGroup({ title, items }: KpiGroupProps) {
  return (
    <section>
      <h2 className="text-sm font-semibold text-muted-foreground mb-3">{title}</h2>
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
        {items.map((item) => (
          <StatsCard
            key={item.label}
            label={item.label}
            value={item.value}
            subLabel={item.subLabel}
            accent={item.accent}
          />
        ))}
      </div>
    </section>
  )
}
