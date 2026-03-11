import { ShieldCheck, Headphones, WifiOff, Lock } from "lucide-react"

const badges = [
  { icon: ShieldCheck, label: "یک ماه آزمایشی رایگان" },
  { icon: Headphones, label: "پشتیبانی فارسی" },
  { icon: WifiOff, label: "ذخیره آفلاین (PWA)" },
  { icon: Lock, label: "امنیت اطلاعات" },
]

export function TrustStrip() {
  return (
    <section className="border-y border-white/8 bg-[#0F1923] py-10 px-6 overflow-x-auto">
      <div className="flex justify-center gap-4 min-w-max mx-auto">
        {badges.map((badge) => {
          const Icon = badge.icon
          return (
            <div
              key={badge.label}
              className="flex items-center gap-2.5 rounded-full border border-[#1C3D5A] bg-[#1C3D5A]/30 px-5 py-2.5 text-sm font-medium text-[#94A3B8] whitespace-nowrap transition-colors hover:border-[rgba(20,184,166,0.4)] hover:text-[#F1F5F9]"
            >
              <Icon className="h-4 w-4 shrink-0 text-[#14B8A6]" />
              {badge.label}
            </div>
          )
        })}
      </div>
    </section>
  )
}
