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
      className="py-10 px-6 overflow-x-auto"
      style={{
        background: "#F0FDF9",
        borderTop: "1px solid #99F6E4",
        borderBottom: "1px solid #99F6E4",
      }}
    >
      <div className="flex justify-center gap-4 min-w-max mx-auto">
        {badges.map((badge) => {
          const Icon = badge.icon
          return (
            <div
              key={badge.label}
              className="flex items-center gap-2.5 rounded-full px-5 py-2.5 text-sm font-semibold whitespace-nowrap transition-all hover:scale-105"
              style={{
                background: "#FFFFFF",
                border: "1px solid #99F6E4",
                color: "#374151",
                boxShadow: "0 1px 4px rgba(20,184,166,0.08)",
              }}
            >
              <Icon className="h-4 w-4 shrink-0" style={{ color: "#14B8A6" }} />
              {badge.label}
            </div>
          )
        })}
      </div>
    </section>
  )
}
