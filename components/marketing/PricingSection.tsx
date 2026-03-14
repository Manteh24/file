"use client"

import { useState } from "react"
import Link from "next/link"
import { Check, X } from "lucide-react"
import { PLAN_PRICES_TOMAN, PLAN_LABELS } from "@/lib/plan-constants"

type BillingCycle = "MONTHLY" | "ANNUAL"

const featureRows = [
  { label: "پیامک", free: false, pro: true, team: true },
  { label: "نقشه هوشمند", free: false, pro: true, team: true },
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
    <section className="py-20 px-6 bg-white">
      <div className="container mx-auto max-w-5xl">
        <h2 className="text-3xl font-bold text-center text-slate-900 mb-3">پلن‌های اشتراک</h2>
        <p className="text-slate-500 text-center mb-8">
          یک ماه آزمایشی رایگان برای پلن‌های حرفه‌ای و تیم
        </p>

        {/* Billing cycle toggle */}
        <div className="flex justify-center mb-10">
          <div className="inline-flex items-center rounded-full border border-slate-200 bg-slate-100 p-1 gap-1">
            <button
              onClick={() => setCycle("MONTHLY")}
              className={`px-5 py-2 rounded-full text-sm font-medium transition-all ${
                cycle === "MONTHLY"
                  ? "bg-teal-500 text-white shadow"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              ماهانه
            </button>
            <button
              onClick={() => setCycle("ANNUAL")}
              className={`px-5 py-2 rounded-full text-sm font-medium transition-all ${
                cycle === "ANNUAL"
                  ? "bg-teal-500 text-white shadow"
                  : "text-slate-500 hover:text-slate-800"
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
          <div className="rounded-2xl border border-slate-200 bg-white p-6 flex flex-col shadow-sm">
            <h3 className="text-lg font-bold text-slate-900 mb-1">{PLAN_LABELS.FREE}</h3>
            <p className="text-slate-500 text-sm mb-4">برای شروع — بدون نیاز به پرداخت</p>
            <div className="text-4xl font-bold text-slate-900 mb-1">رایگان</div>
            <p className="text-slate-400 text-xs mb-6">همیشگی</p>
            <Link
              href="/register?plan=FREE"
              className="inline-flex h-10 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-sm font-medium text-slate-700 mb-6 transition-all hover:bg-slate-100 hover:border-slate-300"
            >
              شروع رایگان
            </Link>
            <ul className="space-y-2 text-sm text-slate-500">
              <li>۱ کاربر</li>
              <li>تا ۱۰ فایل فعال</li>
              <li>۱۰ درخواست AI در ماه</li>
            </ul>
          </div>

          {/* PRO — highlighted */}
          <div className="rounded-2xl border-2 border-teal-500 bg-white p-6 flex flex-col relative shadow-[0_0_40px_rgba(20,184,166,0.12)]">
            <span className="absolute -top-3 right-1/2 translate-x-1/2 rounded-full bg-teal-500 px-4 py-1 text-xs font-semibold text-white whitespace-nowrap">
              محبوب‌ترین
            </span>
            <h3 className="text-lg font-bold text-slate-900 mb-1">{PLAN_LABELS.PRO}</h3>
            <p className="text-slate-500 text-sm mb-4">برای دفاتر فعال</p>
            <div className="text-4xl font-bold text-slate-900 mb-1" dir="ltr">
              {PLAN_PRICES_TOMAN.PRO[cycle].toLocaleString("fa-IR")}
            </div>
            <p className="text-slate-400 text-xs mb-6">
              تومان / {cycle === "MONTHLY" ? "ماه" : "سال"}
            </p>
            <Link
              href="/register?plan=PRO"
              className="inline-flex h-10 items-center justify-center rounded-full bg-teal-500 text-sm font-semibold text-white mb-2 transition-all hover:bg-teal-600 hover:scale-[1.02]"
            >
              شروع آزمایشی رایگان
            </Link>
            <p className="text-center text-xs text-teal-600 mb-4">۳۰ روز کامل — بدون کارت بانکی</p>
            <ul className="space-y-2 text-sm text-slate-500">
              <li>تا ۷ کاربر</li>
              <li>فایل فعال نامحدود</li>
              <li>AI نامحدود</li>
              <li>گزارش‌های عملکرد</li>
            </ul>
          </div>

          {/* TEAM */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 flex flex-col shadow-sm">
            <h3 className="text-lg font-bold text-slate-900 mb-1">{PLAN_LABELS.TEAM}</h3>
            <p className="text-slate-500 text-sm mb-4">برای سازمان‌های بزرگ</p>
            <div className="text-4xl font-bold text-slate-900 mb-1" dir="ltr">
              {PLAN_PRICES_TOMAN.TEAM[cycle].toLocaleString("fa-IR")}
            </div>
            <p className="text-slate-400 text-xs mb-6">
              تومان / {cycle === "MONTHLY" ? "ماه" : "سال"}
            </p>
            <Link
              href="/register?plan=TEAM"
              className="inline-flex h-10 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-sm font-medium text-slate-700 mb-2 transition-all hover:bg-slate-100 hover:border-slate-300"
            >
              شروع آزمایشی رایگان
            </Link>
            <p className="text-center text-xs text-teal-600 mb-4">۳۰ روز کامل — بدون کارت بانکی</p>
            <ul className="space-y-2 text-sm text-slate-500">
              <li>کاربر نامحدود</li>
              <li>فایل فعال نامحدود</li>
              <li>AI نامحدود</li>
              <li>گزارش‌های پیشرفته + تعیین هدف</li>
              <li>چند شعبه</li>
            </ul>
          </div>
        </div>

        {/* Feature comparison table */}
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="text-start p-4 font-semibold text-slate-800">ویژگی</th>
                <th className="text-center p-4 font-semibold text-slate-400">{PLAN_LABELS.FREE}</th>
                <th className="text-center p-4 font-semibold text-teal-500">{PLAN_LABELS.PRO}</th>
                <th className="text-center p-4 font-semibold text-slate-400">{PLAN_LABELS.TEAM}</th>
              </tr>
            </thead>
            <tbody>
              {featureRows.map((row, i) => (
                <tr
                  key={row.label}
                  className={`border-b border-slate-50 ${i === featureRows.length - 1 ? "border-b-0" : ""}`}
                >
                  <td className="p-4 text-slate-500">{row.label}</td>
                  <td className="p-4 text-center">
                    {row.free ? (
                      <Check className="h-4 w-4 text-teal-500 mx-auto" />
                    ) : (
                      <X className="h-4 w-4 text-slate-200 mx-auto" />
                    )}
                  </td>
                  <td className="p-4 text-center">
                    {row.pro ? (
                      <Check className="h-4 w-4 text-teal-500 mx-auto" />
                    ) : (
                      <X className="h-4 w-4 text-slate-200 mx-auto" />
                    )}
                  </td>
                  <td className="p-4 text-center">
                    {row.team ? (
                      <Check className="h-4 w-4 text-teal-500 mx-auto" />
                    ) : (
                      <X className="h-4 w-4 text-slate-200 mx-auto" />
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
