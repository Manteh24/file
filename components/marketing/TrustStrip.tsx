import { ShieldCheck, Headphones, WifiOff, Lock } from "lucide-react"

const badges = [
  { icon: ShieldCheck, label: "یک ماه آزمایشی رایگان" },
  { icon: Headphones, label: "پشتیبانی آنلاین" },
  { icon: WifiOff, label: "ذخیره آفلاین (PWA)" },
  { icon: Lock, label: "امنیت اطلاعات" },
]

export function TrustStrip() {
  return (
    <section className="border-y border-slate-100 bg-slate-50 py-10 px-6 overflow-x-auto">
      <div className="flex justify-center gap-4 min-w-max mx-auto">
        {badges.map((badge) => {
          const Icon = badge.icon
          return (
            <div
              key={badge.label}
              className="flex items-center gap-2.5 rounded-full border border-slate-200 bg-white px-5 py-2.5 text-sm font-medium text-slate-600 whitespace-nowrap transition-colors hover:border-teal-300 hover:text-slate-800 shadow-sm"
            >
              <Icon className="h-4 w-4 shrink-0 text-teal-500" />
              {badge.label}
            </div>
          )
        })}
      </div>
    </section>
  )
}
