"use client"

import { useState } from "react"
import Link from "next/link"
import { Check, X } from "lucide-react"
import { PLAN_PRICES_TOMAN, PLAN_LABELS } from "@/lib/plan-constants"

type BillingCycle = "MONTHLY" | "ANNUAL"

const featureRows = [
  { label: "پیامک اشتراک‌گذاری (۳۰/ماه)", free: true, pro: true, team: true },
  { label: "پیامک انبوه", free: false, pro: true, team: true },
  { label: "نقشه پایه (پین و نمایش)", free: true, pro: true, team: true },
  { label: "تحلیل مکانی (POI و مسیر)", free: false, pro: true, team: true },
  { label: "بهبود عکس و واترمارک لوگو", free: false, pro: true, team: true },
  { label: "گزارش‌های مالی", free: false, pro: true, team: true },
  { label: "گزارش‌های عملکرد", free: false, pro: true, team: true },
  { label: "تعیین هدف برای تیم", free: false, pro: false, team: true },
  { label: "لینک‌یابی (تعداد بازدید)", free: false, pro: true, team: true },
  { label: "خروجی PDF", free: false, pro: true, team: true },
  { label: "واترمارک روی لینک", free: true, pro: false, team: false },
  { label: "چند شعبه", free: false, pro: false, team: true },
]

export function PricingSection() {
  const [cycle, setCycle] = useState<BillingCycle>("MONTHLY")

  return (
    <section id="pricing" className="py-20 px-6" style={{ background: "#FFFFFF" }}>
      <div className="container mx-auto max-w-5xl">
        <h2
          className="font-semibold text-center text-[var(--color-text-primary)] mb-3"
          style={{ fontSize: "clamp(1.75rem, 4vw, 2.375rem)" }}
        >
          پلن‌های اشتراک
        </h2>
        <p className="text-[var(--color-text-secondary)] text-center mb-8">
          با پلن رایگان شروع کنید — پلن حرفه‌ای با ۳۰ روز آزمایش رایگان پس از ثبت‌نام
        </p>

        {/* Billing cycle toggle */}
        <div className="flex justify-center mb-10">
          <div className="inline-flex items-center rounded-lg border border-[var(--color-border-default)] bg-[var(--color-surface-2)] p-1 gap-1">
            <button
              onClick={() => setCycle("MONTHLY")}
              className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all ${
                cycle === "MONTHLY"
                  ? "bg-[var(--color-teal-500)] text-white shadow"
                  : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
              }`}
            >
              ماهانه
            </button>
            <button
              onClick={() => setCycle("ANNUAL")}
              className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all ${
                cycle === "ANNUAL"
                  ? "bg-[var(--color-teal-500)] text-white shadow"
                  : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
              }`}
            >
              سالانه
              <span className="mr-1.5 text-xs text-emerald-500 font-normal">۲ ماه رایگان</span>
            </button>
          </div>
        </div>

        {/* Plan cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {/* FREE */}
          <div className="rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-1)] p-6 flex flex-col shadow-sm">
            <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-1">{PLAN_LABELS.FREE}</h3>
            <p className="text-[var(--color-text-secondary)] text-sm mb-4">برای شروع — بدون نیاز به پرداخت</p>
            <div className="text-4xl font-semibold text-[var(--color-text-primary)] mb-1">رایگان</div>
            <p className="text-[var(--color-text-tertiary)] text-xs mb-6">همیشگی</p>
            <Link
              href="/register?plan=FREE"
              className="inline-flex h-10 items-center justify-center rounded-lg border border-[var(--color-border-default)] bg-[var(--color-surface-2)] text-sm font-semibold text-[var(--color-text-secondary)] mb-6 transition-all hover:bg-[var(--color-surface-3)] hover:text-[var(--color-text-primary)]"
            >
              شروع رایگان
            </Link>
            <ul className="space-y-2 text-sm text-[var(--color-text-secondary)]">
              <li>۱ کاربر</li>
              <li>تا ۱۰ فایل فعال</li>
              <li>۱۰ درخواست AI در ماه</li>
            </ul>
          </div>

          {/* PRO — highlighted */}
          <div className="rounded-2xl border-2 border-[var(--color-teal-500)] bg-[var(--color-surface-1)] p-6 flex flex-col relative shadow-[0_0_40px_rgba(20,184,166,0.12)]">
            <span className="absolute -top-3 right-1/2 translate-x-1/2 rounded-lg bg-[var(--color-teal-500)] px-4 py-1 text-xs font-semibold text-white whitespace-nowrap">
              پیشنهادی
            </span>
            <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-1">{PLAN_LABELS.PRO}</h3>
            <p className="text-[var(--color-text-secondary)] text-sm mb-4">برای دفاتر فعال</p>
            <div className="text-4xl font-semibold text-[var(--color-text-primary)] mb-1" dir="ltr">
              {PLAN_PRICES_TOMAN.PRO[cycle].toLocaleString("fa-IR")}
            </div>
            <p className="text-[var(--color-text-tertiary)] text-xs mb-6">
              تومان / {cycle === "MONTHLY" ? "ماه" : "سال"}
            </p>
            <Link
              href="/register?plan=PRO&intent=pro_trial"
              className="inline-flex h-10 items-center justify-center rounded-lg bg-[var(--color-teal-500)] text-sm font-semibold text-white mb-2 transition-all hover:bg-[var(--color-teal-600)] hover:scale-[1.02]"
            >
              انتخاب پلن حرفه‌ای
            </Link>
            <p className="text-center text-xs text-[var(--color-teal-600)] mb-4">۳۰ روز آزمایش رایگان پس از ثبت‌نام</p>
            <ul className="space-y-2 text-sm text-[var(--color-text-secondary)]">
              <li>تا ۱۰ کاربر</li>
              <li>فایل فعال نامحدود</li>
              <li>AI نامحدود</li>
              <li>گزارش‌های عملکرد</li>
            </ul>
          </div>

          {/* TEAM */}
          <div className="rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-1)] p-6 flex flex-col shadow-sm">
            <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-1">{PLAN_LABELS.TEAM}</h3>
            <p className="text-[var(--color-text-secondary)] text-sm mb-4">برای سازمان‌های بزرگ</p>
            <div className="text-4xl font-semibold text-[var(--color-text-primary)] mb-1" dir="ltr">
              {PLAN_PRICES_TOMAN.TEAM[cycle].toLocaleString("fa-IR")}
            </div>
            <p className="text-[var(--color-text-tertiary)] text-xs mb-6">
              تومان / {cycle === "MONTHLY" ? "ماه" : "سال"}
            </p>
            <Link
              href="/register?plan=TEAM"
              className="inline-flex h-10 items-center justify-center rounded-lg border border-[var(--color-border-default)] bg-[var(--color-surface-2)] text-sm font-semibold text-[var(--color-text-secondary)] mb-6 transition-all hover:bg-[var(--color-surface-3)] hover:text-[var(--color-text-primary)]"
            >
              انتخاب پلن تیم
            </Link>
            <ul className="space-y-2 text-sm text-[var(--color-text-secondary)]">
              <li>کاربر نامحدود</li>
              <li>فایل فعال نامحدود</li>
              <li>AI نامحدود</li>
              <li>گزارش‌های پیشرفته + تعیین هدف</li>
              <li>چند شعبه</li>
            </ul>
          </div>
        </div>

        {/* Feature comparison table */}
        <div className="overflow-x-auto rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-1)] shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border-subtle)]">
                <th className="text-start p-4 font-semibold text-[var(--color-text-primary)]">ویژگی</th>
                <th className="text-center p-4 font-semibold text-[var(--color-text-tertiary)]">{PLAN_LABELS.FREE}</th>
                <th className="text-center p-4 font-semibold text-[var(--color-teal-500)]">{PLAN_LABELS.PRO}</th>
                <th className="text-center p-4 font-semibold text-[var(--color-text-tertiary)]">{PLAN_LABELS.TEAM}</th>
              </tr>
            </thead>
            <tbody>
              {featureRows.map((row, i) => (
                <tr
                  key={row.label}
                  className={`border-b border-[var(--color-border-subtle)] ${i === featureRows.length - 1 ? "border-b-0" : ""}`}
                >
                  <td className="p-4 text-[var(--color-text-secondary)]">{row.label}</td>
                  <td className="p-4 text-center">
                    {row.free ? (
                      <Check className="h-4 w-4 text-[var(--color-teal-500)] mx-auto" />
                    ) : (
                      <X className="h-4 w-4 text-[var(--color-border-default)] mx-auto" />
                    )}
                  </td>
                  <td className="p-4 text-center">
                    {row.pro ? (
                      <Check className="h-4 w-4 text-[var(--color-teal-500)] mx-auto" />
                    ) : (
                      <X className="h-4 w-4 text-[var(--color-border-default)] mx-auto" />
                    )}
                  </td>
                  <td className="p-4 text-center">
                    {row.team ? (
                      <Check className="h-4 w-4 text-[var(--color-teal-500)] mx-auto" />
                    ) : (
                      <X className="h-4 w-4 text-[var(--color-border-default)] mx-auto" />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  )
}
