import Link from "next/link"
import { AppLogo } from "./AppLogo"

export function HeroSection() {
  return (
    <section className="relative bg-white overflow-hidden">
      {/* Subtle teal radial glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 80% 60% at 85% 0%, rgba(20,184,166,0.08), transparent)",
        }}
      />
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 50% 40% at 10% 100%, rgba(20,184,166,0.05), transparent)",
        }}
      />

      <div className="relative z-10 container mx-auto max-w-4xl px-6 py-28 text-center">
        {/* Logo */}
        <div className="flex justify-center mb-7">
          <AppLogo size={88} />
        </div>

        {/* Eyebrow */}
        <p className="text-teal-500 text-sm font-semibold tracking-widest uppercase mb-5">
          سیستم مدیریت دفتر املاک
        </p>

        {/* Headline */}
        <h1 className="text-4xl md:text-5xl lg:text-[3.5rem] font-bold text-slate-900 leading-tight mb-6">
          تمام فایل‌های ملکی‌تان
          <br />
          <span className="text-teal-500">یک‌جا</span>
        </h1>

        {/* Sub-headline */}
        <p className="text-slate-500 text-lg mb-3 max-w-2xl mx-auto leading-relaxed">
          از ثبت فایل تا اشتراک‌گذاری با مشتری، از CRM تا گزارش مالی — همه در یک پلتفرم
        </p>
        <p className="text-slate-400 text-sm mb-12">
          ۱ ماه آزمایشی کاملاً رایگان
        </p>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <Link
            href="/register?plan=PRO"
            className="inline-flex h-12 items-center justify-center rounded-full bg-teal-500 px-9 text-base font-semibold text-white transition-all hover:bg-teal-600 hover:scale-105"
          >
            شروع رایگان — یک ماه
          </Link>
          <Link
            href="/register?plan=FREE"
            className="inline-flex h-12 items-center justify-center rounded-full border border-slate-200 bg-white px-9 text-base font-medium text-slate-700 transition-all hover:bg-slate-50 hover:border-slate-300 hover:scale-105"
          >
            پلن رایگان
          </Link>
        </div>
      </div>
    </section>
  )
}
