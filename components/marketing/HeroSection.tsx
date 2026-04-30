"use client"

import { useState, useRef, useEffect } from "react"
import Link from "next/link"
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
        router.push(`/register?identifier=${encodeURIComponent(trimmed)}`)
      }
    } catch {
      router.push("/register")
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
              <ArrowLeft className="h-3.5 w-3.5" />
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
  const [hasInteracted, setHasInteracted] = useState(false)
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [animKey, setAnimKey] = useState(0)

  // Auto-cycle through features until the user manually picks one
  useEffect(() => {
    if (hasInteracted) return
    const ids = features.map((f) => f.id)
    const timer = setInterval(() => {
      setIsTransitioning(true)
      setTimeout(() => {
        setActiveFeature((prev) => ids[(ids.indexOf(prev) + 1) % ids.length])
        setAnimKey((k) => k + 1)
        setIsTransitioning(false)
      }, 200)
    }, 2600)
    return () => clearInterval(timer)
  }, [hasInteracted])

  function handleFeatureSelect(id: string) {
    if (id === activeFeature) return
    if (!hasInteracted) setHasInteracted(true)
    setIsTransitioning(true)
    setTimeout(() => {
      setActiveFeature(id)
      setAnimKey((k) => k + 1)
      setIsTransitioning(false)
    }, 160)
  }

  const DemoContent = demoComponents[activeFeature] ?? DemoFiles
  const activeData = features.find((f) => f.id === activeFeature) ?? features[0]
  const ActiveIcon = activeData.icon

  return (
    <div
      className="relative"
      style={{
        isolation: "isolate",
        cursor: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='28' height='28' viewBox='0 0 28 28'%3E%3Cpath d='M5 2 L5 22 L9.5 17.5 L13 25 L15.5 24 L12 16.5 L18 16.5 Z' fill='white' stroke='%23374151' stroke-width='1.5' stroke-linejoin='round' stroke-linecap='round'/%3E%3C/svg%3E") 5 2, default`,
        // Force dark palette regardless of page theme
        ["--color-surface-1" as string]: "#131C2E",
        ["--color-surface-2" as string]: "#1A2540",
        ["--color-surface-3" as string]: "#243152",
        ["--color-surface-4" as string]: "#2E3E66",
        ["--color-text-primary" as string]: "#F5F5F4",
        ["--color-text-secondary" as string]: "#A8A29E",
        ["--color-text-tertiary" as string]: "#78716C",
        ["--color-border-subtle" as string]: "rgba(255,255,255,0.08)",
        ["--color-border-default" as string]: "rgba(255,255,255,0.14)",
        ["--color-teal-50" as string]: "rgba(20,184,166,0.10)",
        ["--color-teal-100" as string]: "rgba(20,184,166,0.18)",
        ["--color-teal-200" as string]: "rgba(20,184,166,0.28)",
        ["--color-teal-700" as string]: "#5EEAD4",
      } as React.CSSProperties}
    >
      <style>{`
        @keyframes heroFloat {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          33% { transform: translateY(-6px) rotate(0.3deg); }
          66% { transform: translateY(-3px) rotate(-0.2deg); }
        }
        @keyframes heroBreathe {
          0%, 100% { opacity: 0.5; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.08); }
        }
        @keyframes heroBreathe2 {
          0%, 100% { opacity: 0.3; transform: scale(1); }
          50% { opacity: 0.7; transform: scale(1.12); }
        }
        @keyframes heroRingPulse {
          0% { transform: scale(1); opacity: 0.7; }
          70% { transform: scale(1.6); opacity: 0; }
          100% { transform: scale(1.6); opacity: 0; }
        }
        @keyframes heroHintBadge {
          0%, 100% { box-shadow: 0 0 0 0 rgba(20,184,166,0.5); }
          50% { box-shadow: 0 0 0 6px rgba(20,184,166,0); }
        }
        @keyframes heroTooltipIn {
          from { opacity: 0; transform: translateY(-50%) translateX(4px); }
          to   { opacity: 1; transform: translateY(-50%) translateX(0); }
        }
        @keyframes heroScanline {
          0% { top: 0%; opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { top: 100%; opacity: 0; }
        }
        @keyframes heroDotFade {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 1; }
        }
      `}</style>

      {/* Ambient glow — teal */}
      <div
        className="absolute pointer-events-none"
        style={{
          inset: "-20%",
          background: "radial-gradient(ellipse 70% 60% at 65% 35%, rgba(20,184,166,0.22) 0%, transparent 65%)",
          filter: "blur(24px)",
          animation: "heroBreathe 5s ease-in-out infinite",
          zIndex: -1,
        }}
      />
      {/* Ambient glow — indigo accent */}
      <div
        className="absolute pointer-events-none"
        style={{
          inset: "-20%",
          background: "radial-gradient(ellipse 50% 50% at 20% 75%, rgba(99,102,241,0.14) 0%, transparent 60%)",
          filter: "blur(32px)",
          animation: "heroBreathe2 7s ease-in-out infinite 1.5s",
          zIndex: -1,
        }}
      />

      {/* "Try it" hint badge — disappears after interaction */}
      {!hasInteracted && (
        <div
          className="absolute -top-3 left-1/2 -translate-x-1/2 z-30 flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-bold text-white cursor-default"
          style={{
            background: "linear-gradient(135deg, #14B8A6 0%, #0D9488 100%)",
            animation: "heroHintBadge 2s ease-in-out infinite",
          }}
        >
          <span>امکانات</span>
          <span style={{ fontSize: 10 }}>✦</span>
        </div>
      )}

      {/* Main panel */}
      <div
        className="relative rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-1)] shadow-2xl overflow-hidden select-none"
        style={{ animation: "heroFloat 7s ease-in-out infinite" }}
      >
        {/* Subtle scan-line shimmer — only before interaction */}
        {!hasInteracted && (
          <div
            className="absolute inset-x-0 h-px pointer-events-none z-20"
            style={{
              background: "linear-gradient(to left, transparent 0%, rgba(20,184,166,0.6) 50%, transparent 100%)",
              animation: "heroScanline 3s ease-in-out infinite 1s",
            }}
          />
        )}

        {/* Mock topbar */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--color-border-subtle)]">
          <div className="flex items-center gap-2">
            <img src="/logo-black.png" alt="" className="h-5 w-5 rounded-md" style={{ filter: "invert(1)" }} />
            <span className="text-xs font-semibold text-[var(--color-text-primary)]">املاک‌بین</span>
          </div>
          {/* Active feature label with animated dot */}
          <div
            className="flex items-center gap-1.5 rounded-md px-2.5 py-1 transition-all duration-300"
            style={{
              color: "var(--color-teal-600)",
              background: "var(--color-teal-50)",
            }}
          >
            <span
              className="inline-block h-1.5 w-1.5 rounded-full"
              style={{
                background: "var(--color-teal-500)",
                animation: "heroDotFade 1.4s ease-in-out infinite",
              }}
            />
            <ActiveIcon className="h-3 w-3" />
            <span className="text-[11px] font-semibold transition-all duration-300">{activeData.label}</span>
          </div>
        </div>

        <div className="flex">
          {/* Icon rail — appears on RIGHT in RTL layout */}
          <div
            className="flex flex-col gap-0.5 p-2 border-l border-[var(--color-border-subtle)]"
            style={{ background: "var(--color-surface-2)" }}
          >
            {features.map((f) => {
              const Icon = f.icon
              const isActive = f.id === activeFeature
              const isHovered = f.id === hoveredFeature

              return (
                <div key={f.id} style={{ position: "relative" }}>
                  {/* Custom tooltip — slides in to the LEFT (toward content area) */}
                  {isHovered && (
                    <div
                      className="absolute z-50 whitespace-nowrap rounded-xl text-[11px] font-semibold pointer-events-none"
                      style={{
                        top: "50%",
                        right: "calc(100% + 10px)",
                        transform: "translateY(-50%)",
                        padding: "5px 10px",
                        background: "var(--color-surface-1)",
                        color: "var(--color-text-primary)",
                        border: "1px solid var(--color-border-subtle)",
                        boxShadow: "0 4px 20px rgba(0,0,0,0.14)",
                        animation: "heroTooltipIn 0.15s ease-out",
                      }}
                    >
                      {f.tooltip}
                      {/* Arrow pointing right toward icon */}
                      <span style={{
                        position: "absolute",
                        top: "50%",
                        left: "100%",
                        transform: "translateY(-50%)",
                        width: 0,
                        height: 0,
                        borderTop: "5px solid transparent",
                        borderBottom: "5px solid transparent",
                        borderLeft: "6px solid var(--color-border-subtle)",
                      }} />
                      <span style={{
                        position: "absolute",
                        top: "50%",
                        left: "calc(100% - 1px)",
                        transform: "translateY(-50%)",
                        width: 0,
                        height: 0,
                        borderTop: "5px solid transparent",
                        borderBottom: "5px solid transparent",
                        borderLeft: "6px solid var(--color-surface-1)",
                      }} />
                    </div>
                  )}

                  <button
                    onClick={() => handleFeatureSelect(f.id)}
                    onMouseEnter={() => setHoveredFeature(f.id)}
                    onMouseLeave={() => setHoveredFeature(null)}
                    className="relative h-8 w-8 flex items-center justify-center rounded-lg transition-all duration-200"
                    style={{
                      background: isActive ? "var(--color-teal-500)" : isHovered ? "var(--color-surface-3)" : "transparent",
                      color: isActive ? "white" : isHovered ? "var(--color-text-primary)" : "var(--color-text-tertiary)",
                      opacity: !isActive && !isHovered ? 0.4 : 1,
                      transform: isHovered && !isActive ? "scale(1.12)" : "scale(1)",
                      boxShadow: isActive ? "0 2px 8px rgba(20,184,166,0.4)" : "none",
                    }}
                  >
                    {/* Pulsing ring — hints interactivity before first click */}
                    {isActive && !hasInteracted && (
                      <span
                        className="absolute inset-0 rounded-lg"
                        style={{
                          border: "2px solid var(--color-teal-400)",
                          animation: "heroRingPulse 1.8s ease-out infinite",
                        }}
                      />
                    )}
                    <Icon className="h-3.5 w-3.5 relative z-10" />
                  </button>
                </div>
              )
            })}
          </div>

          {/* Demo content area */}
          <div className="flex-1 p-3 overflow-hidden relative" style={{ height: 282 }}>
            {/* Bottom fade-out gradient */}
            <div
              className="absolute bottom-0 inset-x-0 h-12 pointer-events-none z-10"
              style={{ background: "linear-gradient(to top, var(--color-surface-1) 0%, transparent 100%)" }}
            />
            {/* Content with fade+slide transition */}
            <div
              key={animKey}
              style={{
                opacity: isTransitioning ? 0 : 1,
                transform: isTransitioning ? "translateY(6px)" : "translateY(0)",
                transition: "opacity 0.2s ease, transform 0.22s ease",
              }}
            >
              <DemoContent />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ─── Mobile sticky CTA ───────────────────────────────────────────────────── */

function MobileStickyHeroCTA() {
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const hero = document.getElementById("hero")
    if (!hero || typeof IntersectionObserver === "undefined") return

    const observer = new IntersectionObserver(
      ([entry]) => setVisible(entry.isIntersecting),
      { threshold: 0.05 }
    )
    observer.observe(hero)
    return () => observer.disconnect()
  }, [])

  return (
    <div
      className={`lg:hidden fixed inset-x-0 z-40 px-4 transition-[opacity,transform] duration-200 ease-out ${
        visible
          ? "opacity-100 translate-y-0 pointer-events-auto"
          : "opacity-0 translate-y-4 pointer-events-none"
      }`}
      style={{ bottom: "calc(env(safe-area-inset-bottom) + 0.75rem)" }}
      aria-hidden={!visible}
    >
      <Link
        href="/register"
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--color-teal-500)] px-5 py-3.5 text-base font-semibold text-white shadow-lg shadow-teal-500/30 hover:bg-[var(--color-teal-600)] active:scale-[0.98] transition-transform"
      >
        شروع رایگان — ۱ ماه آزمایشی
        <ArrowLeft className="h-4 w-4" />
      </Link>
    </div>
  )
}

/* ─── HeroSection ─────────────────────────────────────────────────────────── */

export function HeroSection() {
  return (
    <>
    <section id="hero" className="relative overflow-hidden" style={{ background: "#FFFFFF" }}>
      {/* Background glows */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: "radial-gradient(ellipse 80% 60% at 85% 0%, rgba(20,184,166,0.09), transparent)" }}
      />
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: "radial-gradient(ellipse 50% 40% at 10% 100%, rgba(20,184,166,0.05), transparent)" }}
      />
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: "radial-gradient(ellipse 40% 40% at 60% 50%, rgba(99,102,241,0.04), transparent)" }}
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
              وقتی مشتری زنگ زد،
              <br />
              <span className="text-[var(--color-teal-500)]">یک لینک حرفه‌ای</span> برایش بفرست
            </h1>
            <p className="text-[var(--color-text-secondary)] text-lg mb-2 max-w-xl mx-auto lg:mx-0 leading-relaxed">
              فایل را ثبت کن، عکس و توضیحات را آماده کن، با یک تپ بفرست — همه‌اش از همان گوشی.
            </p>
            <p className="text-[var(--color-text-tertiary)] text-sm mb-10">
              ۱ ماه آزمایشی کاملاً رایگان
            </p>

            <AuthWidget />
          </div>

          {/* LEFT (45%): Interactive demo panel — hidden on mobile */}
          <div className="hidden lg:block lg:w-[45%] shrink-0 pt-6">
            <InteractiveDemo />
          </div>
        </div>
      </div>
    </section>
    <MobileStickyHeroCTA />
    </>
  )
}
