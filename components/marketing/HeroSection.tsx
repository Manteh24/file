import Link from "next/link"
import { AppLogo } from "./AppLogo"

export function HeroSection() {
  return (
    <section className="relative bg-[#0F1923] overflow-hidden">
      {/* Teal radial glow — top-right (RTL reading-start) */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 80% 60% at 85% 0%, rgba(20,184,166,0.18), transparent)",
        }}
      />
      {/* Secondary subtle glow — bottom-left */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 50% 40% at 10% 100%, rgba(20,184,166,0.06), transparent)",
        }}
      />

      <div className="relative z-10 container mx-auto max-w-4xl px-6 py-28 text-center">
        {/* Logo */}
        <div className="flex justify-center mb-7">
          <AppLogo size={80} />
        </div>

        {/* Eyebrow */}
        <p className="text-[#14B8A6] text-sm font-semibold tracking-widest uppercase mb-5">
          سیستم مدیریت دفتر املاک
        </p>

        {/* Headline */}
        <h1 className="text-4xl md:text-5xl lg:text-[3.5rem] font-bold text-[#F1F5F9] leading-tight mb-6">
          تمام فایل‌های ملکی‌تان
          <br />
          <span className="text-[#14B8A6]">یک‌جا</span>
        </h1>

        {/* Sub-headline */}
        <p className="text-[#94A3B8] text-lg mb-3 max-w-2xl mx-auto leading-relaxed">
          از ثبت فایل تا اشتراک‌گذاری با مشتری، از CRM تا گزارش مالی — همه در یک پلتفرم فارسی
        </p>
        <p className="text-[#475569] text-sm mb-12">
          ۱ ماه آزمایشی کاملاً رایگان · بدون نیاز به کارت بانکی
        </p>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <Link
            href="/register?plan=PRO"
            className="inline-flex h-12 items-center justify-center rounded-full bg-[#14B8A6] px-9 text-base font-semibold text-white transition-all hover:bg-[#0D9488] hover:scale-105 pulse-ring-btn"
          >
            شروع رایگان — یک ماه
          </Link>
          <Link
            href="/register?plan=FREE"
            className="inline-flex h-12 items-center justify-center rounded-full border border-white/15 bg-white/5 px-9 text-base font-medium text-[#F1F5F9] transition-all hover:bg-white/10 hover:border-white/25 hover:scale-105"
          >
            پلن رایگان
          </Link>
        </div>
      </div>
    </section>
  )
}
