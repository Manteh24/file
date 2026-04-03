"use client"

import { useState, useRef } from "react"
import { useRouter } from "next/navigation"
import {
  FolderOpen,
  Users,
  Link2,
  Sparkles,
  BarChart2,
  MapPin,
  FileText,
  MessageSquare,
  ArrowLeft,
  Check,
  TrendingUp,
} from "lucide-react"

/* ─── Feature tabs ────────────────────────────────────────────────────────── */

const features = [
  {
    id: "files",
    icon: FolderOpen,
    label: "فایل‌های ملک",
    tooltip: "ثبت و مدیریت همه فایل‌ها",
  },
  {
    id: "crm",
    icon: Users,
    label: "مشتریان",
    tooltip: "CRM و تاریخچه تماس",
  },
  {
    id: "share",
    icon: Link2,
    label: "لینک اشتراک",
    tooltip: "لینک با قیمت اختصاصی",
  },
  {
    id: "ai",
    icon: Sparkles,
    label: "هوش مصنوعی",
    tooltip: "توضیحات حرفه‌ای خودکار",
  },
  {
    id: "reports",
    icon: BarChart2,
    label: "گزارش‌ها",
    tooltip: "تحلیل عملکرد و درآمد",
  },
  {
    id: "contracts",
    icon: FileText,
    label: "قراردادها",
    tooltip: "ثبت معامله و کمیسیون",
  },
  {
    id: "map",
    icon: MapPin,
    label: "نقشه هوشمند",
    tooltip: "موقعیت و امکانات محله",
  },
  {
    id: "sms",
    icon: MessageSquare,
    label: "پیامک",
    tooltip: "ارسال به مشتری با یک کلیک",
  },
]

/* ─── Demo panel content per feature ─────────────────────────────────────── */

function DemoFiles() {
  const files = [
    { title: "آپارتمان ونک", meta: "۱۸۰ م · ۳ خواب", price: "۱۵.۵ میلیارد", active: true },
    { title: "ویلا لواسان", meta: "۴۵۰ م · ۵ خواب", price: "۳۸ میلیارد", active: false },
    { title: "اداری جردن", meta: "۱۱۰ م · تجاری", price: "اجاره ۲۰ م", active: true },
    { title: "مسکونی نیاوران", meta: "۲۲۰ م · ۴ خواب", price: "۲۸ میلیارد", active: true },
  ]
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold text-[var(--color-text-primary)]">فایل‌های فعال</span>
        <span className="rounded-md bg-[var(--color-teal-500)] px-2.5 py-1 text-[11px] font-semibold text-white cursor-pointer">+ فایل جدید</span>
      </div>
      {files.map((f) => (
        <div key={f.title} className="flex items-center justify-between rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-surface-2)] px-3 py-2.5 cursor-pointer hover:border-[var(--color-teal-300)] transition-colors">
          <div className="flex items-center gap-2.5">
            <span className={`h-2 w-2 rounded-full shrink-0 ${f.active ? "bg-[var(--color-teal-500)]" : "bg-[var(--color-surface-4)]"}`} />
            <div>
              <p className="text-sm font-semibold text-[var(--color-text-primary)]">{f.title}</p>
              <p className="text-[11px] text-[var(--color-text-tertiary)]">{f.meta}</p>
            </div>
          </div>
          <p className="text-xs font-semibold text-[var(--color-teal-600)]">{f.price}</p>
        </div>
      ))}
    </div>
  )
}

function DemoCrm() {
  const customers = [
    { name: "علی رضایی", type: "خریدار", tag: "داغ", tagColor: "#EF4444" },
    { name: "مریم احمدی", type: "مستاجر", tag: "در حال پیگیری", tagColor: "#F59E0B" },
    { name: "حسین موسوی", type: "فروشنده", tag: "تازه", tagColor: "#14B8A6" },
  ]
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold text-[var(--color-text-primary)]">مشتریان</span>
        <span className="text-xs text-[var(--color-text-tertiary)]">۱۲ مشتری فعال</span>
      </div>
      {customers.map((c) => (
        <div key={c.name} className="flex items-center justify-between rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-surface-2)] px-3 py-2.5 cursor-pointer hover:border-[var(--color-teal-300)] transition-colors">
          <div className="flex items-center gap-2.5">
            <div className="h-7 w-7 rounded-full bg-[var(--color-teal-50)] flex items-center justify-center text-xs font-semibold text-[var(--color-teal-700)]">
              {c.name.charAt(0)}
            </div>
            <div>
              <p className="text-sm font-semibold text-[var(--color-text-primary)]">{c.name}</p>
              <p className="text-[11px] text-[var(--color-text-tertiary)]">{c.type}</p>
            </div>
          </div>
          <span className="text-[10px] font-semibold rounded-full px-2 py-0.5 text-white" style={{ background: c.tagColor }}>{c.tag}</span>
        </div>
      ))}
    </div>
  )
}

function DemoShare() {
  return (
    <div className="space-y-3">
      <div className="mb-3">
        <span className="text-xs font-semibold text-[var(--color-text-primary)]">لینک‌های اشتراک‌گذاری</span>
      </div>
      {[
        { customer: "علی رضایی", price: "۱۵.۵ میلیارد", views: "۷ بازدید", active: true },
        { customer: "مریم احمدی", price: "۱۴.۸ میلیارد", views: "۳ بازدید", active: true },
      ].map((l) => (
        <div key={l.customer} className="rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-surface-2)] p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-[var(--color-text-primary)]">{l.customer}</span>
            <span className="text-[10px] bg-green-100 text-green-700 rounded-full px-2 py-0.5 font-semibold">فعال</span>
          </div>
          <div className="flex items-center justify-between text-xs text-[var(--color-text-secondary)]">
            <span>قیمت: {l.price}</span>
            <span>{l.views}</span>
          </div>
          <div className="mt-2 flex items-center gap-1 text-[11px] text-[var(--color-teal-600)] cursor-pointer">
            <Link2 className="h-3 w-3" />
            <span>view.amlakbin.ir/a8f3...</span>
          </div>
        </div>
      ))}
    </div>
  )
}

function DemoAi() {
  const [tone, setTone] = useState<"formal" | "standard" | "compelling">("compelling")
  const texts = {
    formal: "این واحد مسکونی ۱۸۰ متری در منطقه ونک تهران، دارای ۳ اتاق خواب و نمای مدرن می‌باشد. موقعیت مناسب و دسترسی آسان به حمل‌ونقل عمومی.",
    standard: "آپارتمان ۱۸۰ متری در ونک با ۳ خواب — طراحی شیک، نور عالی، دسترسی به مترو در ۵ دقیقه پیاده‌روی.",
    compelling: "✨ یک فرصت نادر در قلب ونک! آپارتمان ۱۸۰ متری با دید فوق‌العاده، ۳ خواب لوکس، و موقعیتی که رویا بود...",
  }
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-2">
        <Sparkles className="h-4 w-4 text-[var(--color-teal-500)]" />
        <span className="text-xs font-semibold text-[var(--color-text-primary)]">توضیحات هوشمند</span>
      </div>
      <div className="flex gap-1.5">
        {(["formal", "standard", "compelling"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTone(t)}
            className={`flex-1 rounded-lg py-1.5 text-[11px] font-semibold transition-all ${
              tone === t ? "bg-[var(--color-teal-500)] text-white" : "bg-[var(--color-surface-3)] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-4)]"
            }`}
          >
            {t === "formal" ? "رسمی" : t === "standard" ? "معمولی" : "جذاب"}
          </button>
        ))}
      </div>
      <div className="rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-surface-2)] p-3 text-xs text-[var(--color-text-secondary)] leading-relaxed min-h-[80px]">
        {texts[tone]}
      </div>
      <button className="w-full flex items-center justify-center gap-1.5 rounded-lg bg-[var(--color-teal-500)] py-2 text-xs font-semibold text-white hover:bg-[var(--color-teal-600)] transition-colors">
        <Sparkles className="h-3.5 w-3.5" />
        تولید مجدد
      </button>
    </div>
  )
}

function DemoReports() {
  const bars = [
    { label: "فر", value: 60, amount: "۱۲ م" },
    { label: "ارد", value: 85, amount: "۱۷ م" },
    { label: "خرد", value: 45, amount: "۹ م" },
    { label: "تیر", value: 95, amount: "۱۹ م" },
    { label: "مرد", value: 70, amount: "۱۴ م" },
  ]
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold text-[var(--color-text-primary)]">درآمد ماهانه</span>
        <div className="flex items-center gap-1 text-xs text-green-600">
          <TrendingUp className="h-3.5 w-3.5" />
          <span>+۲۳٪</span>
        </div>
      </div>
      <div className="flex items-end gap-2 h-20">
        {bars.map((b) => (
          <div key={b.label} className="flex flex-col items-center gap-1 flex-1">
            <span className="text-[9px] text-[var(--color-text-tertiary)]">{b.amount}</span>
            <div
              className="w-full rounded-t-md bg-[var(--color-teal-500)] opacity-80 hover:opacity-100 transition-all cursor-pointer"
              style={{ height: `${b.value}%` }}
            />
            <span className="text-[9px] text-[var(--color-text-tertiary)]">{b.label}</span>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-2 mt-2">
        {[
          { label: "قراردادها", value: "۵" },
          { label: "کمیسیون کل", value: "۷۱ م" },
        ].map((s) => (
          <div key={s.label} className="rounded-lg bg-[var(--color-surface-2)] p-2 text-center">
            <p className="text-base font-semibold text-[var(--color-teal-500)]">{s.value}</p>
            <p className="text-[10px] text-[var(--color-text-tertiary)]">{s.label}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

function DemoContracts() {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold text-[var(--color-text-primary)]">آخرین قراردادها</span>
      </div>
      {[
        { title: "فروش آپارتمان ونک", date: "۱۴۰۴/۰۲/۱۵", commission: "۱۵ م", status: "نهایی" },
        { title: "اجاره اداری جردن", date: "۱۴۰۴/۰۲/۰۸", commission: "۸ م", status: "نهایی" },
        { title: "فروش ویلا لواسان", date: "۱۴۰۴/۰۱/۲۸", commission: "۳۸ م", status: "در جریان" },
      ].map((c) => (
        <div key={c.title} className="rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-surface-2)] px-3 py-2.5">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-[var(--color-text-primary)] truncate">{c.title}</span>
            <span className={`text-[10px] font-semibold rounded-full px-2 py-0.5 shrink-0 ${c.status === "نهایی" ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}>{c.status}</span>
          </div>
          <div className="flex items-center justify-between mt-1 text-[11px] text-[var(--color-text-tertiary)]">
            <span>{c.date}</span>
            <span className="font-semibold text-[var(--color-teal-600)]">کمیسیون: {c.commission}</span>
          </div>
        </div>
      ))}
    </div>
  )
}

function DemoMap() {
  return (
    <div className="space-y-3">
      <div className="mb-2">
        <span className="text-xs font-semibold text-[var(--color-text-primary)]">تحلیل موقعیت مکانی</span>
      </div>
      <div className="rounded-xl overflow-hidden border border-[var(--color-border-subtle)] bg-[var(--color-surface-3)] h-28 flex items-center justify-center relative">
        <div className="absolute inset-0 opacity-20" style={{ background: "repeating-linear-gradient(0deg, transparent, transparent 20px, var(--color-teal-300) 20px, var(--color-teal-300) 21px), repeating-linear-gradient(90deg, transparent, transparent 20px, var(--color-teal-300) 20px, var(--color-teal-300) 21px)" }} />
        <div className="relative flex flex-col items-center gap-1">
          <MapPin className="h-8 w-8 text-[var(--color-teal-500)]" />
          <span className="text-xs font-semibold text-[var(--color-text-primary)]">ونک، تهران</span>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {[
          { label: "مترو", value: "۵ دقیقه" },
          { label: "فرودگاه", value: "۲۵ دقیقه" },
          { label: "مدرسه", value: "۳ مورد" },
          { label: "بیمارستان", value: "۲ مورد" },
        ].map((s) => (
          <div key={s.label} className="rounded-lg bg-[var(--color-surface-2)] px-2.5 py-2">
            <p className="text-xs font-semibold text-[var(--color-text-primary)]">{s.value}</p>
            <p className="text-[10px] text-[var(--color-text-tertiary)]">{s.label}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

function DemoSms() {
  return (
    <div className="space-y-3">
      <div className="mb-2">
        <span className="text-xs font-semibold text-[var(--color-text-primary)]">ارسال پیامک</span>
      </div>
      <div className="rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-surface-2)] p-3 space-y-2">
        <div className="flex items-center gap-2 text-xs text-[var(--color-text-secondary)]">
          <span className="font-semibold">گیرنده:</span>
          <span>علی رضایی (۰۹۱۲...)</span>
        </div>
        <div className="text-xs text-[var(--color-text-primary)] leading-relaxed bg-[var(--color-surface-1)] rounded-md p-2 border border-[var(--color-border-subtle)]">
          سلام علی جان، ملک موردنظر شما در ونک آماده بازدیده. لینک اختصاصی: view.amlakbin.ir/a8f3
        </div>
        <div className="flex items-center justify-between text-[11px] text-[var(--color-text-tertiary)]">
          <span>۱۶۸ حرف</span>
          <span>۱ پیامک</span>
        </div>
      </div>
      <button className="w-full flex items-center justify-center gap-1.5 rounded-lg bg-[var(--color-teal-500)] py-2 text-xs font-semibold text-white hover:bg-[var(--color-teal-600)] transition-colors">
        <MessageSquare className="h-3.5 w-3.5" />
        ارسال پیامک
      </button>
      <div className="flex items-center gap-1.5 text-[11px] text-green-600">
        <Check className="h-3 w-3" />
        <span>پیامک قبلی ارسال شد — ۵ دقیقه پیش</span>
      </div>
    </div>
  )
}

const demoComponents: Record<string, React.FC> = {
  files: DemoFiles,
  crm: DemoCrm,
  share: DemoShare,
  ai: DemoAi,
  reports: DemoReports,
  contracts: DemoContracts,
  map: DemoMap,
  sms: DemoSms,
}

/* ─── Auth widget ─────────────────────────────────────────────────────────── */

function AuthWidget() {
  const router = useRouter()
  const [value, setValue] = useState("")
  const [checking, setChecking] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = value.trim()
    if (!trimmed) return

    setChecking(true)
    try {
      const res = await fetch("/api/auth/check-identifier", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier: trimmed }),
      })
      const data = await res.json()
      if (data.exists) {
        router.push(`/login?identifier=${encodeURIComponent(trimmed)}`)
      } else {
        router.push(`/register?plan=PRO&identifier=${encodeURIComponent(trimmed)}`)
      }
    } catch {
      router.push("/register?plan=PRO")
    } finally {
      setChecking(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-sm mx-auto lg:mx-0">
      <div className="flex items-center rounded-lg border border-[var(--color-border-default)] bg-[var(--color-surface-2)] overflow-hidden focus-within:border-[var(--color-teal-500)] transition-colors">
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="ایمیل یا شماره موبایل"
          className="flex-1 bg-transparent px-4 py-3 text-sm outline-none text-[var(--color-text-primary)] placeholder:text-[var(--color-text-tertiary)]"
          dir="rtl"
          type="text"
          autoComplete="email tel"
        />
        <button
          type="submit"
          disabled={checking || !value.trim()}
          className="m-1 inline-flex items-center justify-center gap-1.5 rounded-md bg-[var(--color-teal-500)] px-4 py-2.5 text-sm font-semibold text-white whitespace-nowrap hover:bg-[var(--color-teal-600)] transition-colors disabled:opacity-60"
        >
          {checking ? (
            <span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
          ) : (
            <>
              شروع
              <ArrowLeft className="h-3.5 w-3.5 rtl:scale-x-[-1]" />
            </>
          )}
        </button>
      </div>
      <p className="mt-2.5 text-xs text-[var(--color-text-tertiary)]">
        با ادامه، شرایط استفاده و حریم خصوصی را می‌پذیرید
      </p>
    </form>
  )
}

/* ─── Interactive demo panel ──────────────────────────────────────────────── */

function InteractiveDemo() {
  const [activeFeature, setActiveFeature] = useState("files")
  const [hoveredFeature, setHoveredFeature] = useState<string | null>(null)

  const DemoContent = demoComponents[activeFeature] ?? DemoFiles
  const displayFeature = hoveredFeature ?? activeFeature
  const activeData = features.find((f) => f.id === displayFeature) ?? features[0]

  return (
    <div className="rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-1)] shadow-xl overflow-hidden select-none">
      {/* Mock topbar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--color-border-subtle)]">
        <div className="flex items-center gap-2">
          <img src="/logo-black.png" alt="" className="h-5 w-5 rounded-md dark:invert" />
          <span className="text-xs font-semibold text-[var(--color-text-primary)]">املاکبین</span>
        </div>
        <span className="text-[11px] font-semibold text-[var(--color-teal-600)] bg-[var(--color-teal-50)] px-2.5 py-1 rounded-md">
          {activeData.label}
        </span>
      </div>

      <div className="flex">
        {/* Left: feature icon rail */}
        <div className="flex flex-col gap-0.5 p-2 border-l border-[var(--color-border-subtle)] bg-[var(--color-surface-2)]">
          {features.map((f) => {
            const Icon = f.icon
            const isActive = f.id === activeFeature
            const isHovered = f.id === hoveredFeature
            return (
              <button
                key={f.id}
                onClick={() => setActiveFeature(f.id)}
                onMouseEnter={() => setHoveredFeature(f.id)}
                onMouseLeave={() => setHoveredFeature(null)}
                title={f.tooltip}
                className={`relative h-8 w-8 flex items-center justify-center rounded-lg transition-all ${
                  isActive
                    ? "bg-[var(--color-teal-500)] text-white"
                    : isHovered
                    ? "bg-[var(--color-surface-3)] text-[var(--color-text-primary)]"
                    : "text-[var(--color-text-tertiary)] hover:bg-[var(--color-surface-3)]"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
              </button>
            )
          })}
        </div>

        {/* Right: demo content */}
        <div className="flex-1 p-3 overflow-hidden" style={{ minHeight: 280 }}>
          <DemoContent key={activeFeature} />
        </div>
      </div>
    </div>
  )
}

/* ─── HeroSection ─────────────────────────────────────────────────────────── */

export function HeroSection() {
  return (
    <section id="hero" className="relative overflow-hidden" style={{ background: "var(--color-base)" }}>
      {/* Teal radial glows */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: "radial-gradient(ellipse 80% 60% at 85% 0%, rgba(20,184,166,0.08), transparent)" }}
      />
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: "radial-gradient(ellipse 50% 40% at 10% 100%, rgba(20,184,166,0.05), transparent)" }}
      />

      <div className="relative z-10 container mx-auto max-w-6xl px-6 py-20 lg:py-28">
        <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-16">
          {/* RIGHT (55%): content + auth widget */}
          <div className="flex-1 lg:w-[55%] text-center lg:text-right">
            <p className="text-[var(--color-teal-500)] text-sm font-semibold tracking-widest mb-5">
              سیستم مدیریت دفتر املاک
            </p>
            <h1
              className="font-semibold text-[var(--color-text-primary)] leading-[1.15] mb-6"
              style={{ fontSize: "clamp(2rem, 5vw, 3.25rem)" }}
            >
              تمام فایل‌های ملکی‌تان
              <br />
              <span className="text-[var(--color-teal-500)]">یک‌جا</span>
            </h1>
            <p className="text-[var(--color-text-secondary)] text-lg mb-2 max-w-xl mx-auto lg:mx-0 leading-relaxed">
              از ثبت فایل تا اشتراک‌گذاری با مشتری، از CRM تا گزارش مالی — همه در یک پلتفرم
            </p>
            <p className="text-[var(--color-text-tertiary)] text-sm mb-10">
              ۱ ماه آزمایشی کاملاً رایگان
            </p>

            <AuthWidget />
          </div>

          {/* LEFT (45%): Interactive demo panel — hidden on mobile */}
          <div className="hidden lg:block lg:w-[45%] shrink-0">
            <InteractiveDemo />
          </div>
        </div>
      </div>
    </section>
  )
}
