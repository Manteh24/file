import { ShieldCheck, Headphones, WifiOff, Lock } from "lucide-react"

const badges = [
  { icon: ShieldCheck, label: "یک ماه آزمایشی رایگان" },
  { icon: Headphones, label: "پشتیبانی آنلاین" },
  { icon: WifiOff, label: "ذخیره آفلاین (PWA)" },
  { icon: Lock, label: "امنیت اطلاعات" },
]

export function TrustStrip() {
  return (
    <section
      className="border-y border-[var(--color-border-subtle)] py-10 px-6 overflow-x-auto"
      style={{ background: "var(--color-surface-2)" }}
    >
      <div className="flex justify-center gap-4 min-w-max mx-auto">
        {badges.map((badge) => {
          const Icon = badge.icon
          return (
            <div
              key={badge.label}
              className="flex items-center gap-2.5 rounded-full border border-[var(--color-border-default)] bg-[var(--color-surface-1)] px-5 py-2.5 text-sm font-semibold text-[var(--color-text-secondary)] whitespace-nowrap transition-colors hover:border-[var(--color-teal-300)] hover:text-[var(--color-text-primary)] shadow-sm"
            >
              <Icon className="h-4 w-4 shrink-0 text-[var(--color-teal-500)]" />
              {badge.label}
            </div>
          )
        })}
      </div>
    </section>
  )
}
