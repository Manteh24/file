interface StatsCardProps {
  label: string
  value: string | number
  subLabel?: string
  accent?: "default" | "green" | "amber" | "red"
}

const accentClasses = {
  default: "border-border",
  green: "border-green-400",
  amber: "border-amber-400",
  red: "border-red-400",
}

export function StatsCard({ label, value, subLabel, accent = "default" }: StatsCardProps) {
  return (
    <div className={`rounded-xl border-2 bg-card p-5 ${accentClasses[accent]}`}>
      <p className="text-[13px] text-muted-foreground mb-1">{label}</p>
      <p className="text-2xl font-bold tabular-nums">{value}</p>
      {subLabel && <p className="text-xs text-muted-foreground mt-1">{subLabel}</p>}
    </div>
  )
}
