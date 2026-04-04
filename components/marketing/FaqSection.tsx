"use client"

import { useState } from "react"
import { Plus, Minus } from "lucide-react"

const faqs = [
  {
    q: "آیا برای ثبت‌نام رایگان نیاز به پرداخت دارم؟",
    a: "خیر. پلن رایگان کاملاً رایگان است و هیچ اطلاعات پرداختی نیاز ندارد. پلن‌های حرفه‌ای و تیمی با ۳۰ روز آزمایشی رایگان همراه هستند.",
  },
  {
    q: "آیا روی موبایل هم کار می‌کند؟",
    a: "بله. املاک‌بین یک Progressive Web App (PWA) است — یعنی می‌توانید آن را مثل یک اپ روی صفحه اصلی موبایل نصب کنید. مشاوران معمولاً با موبایل کار می‌کنند و مدیران با دسکتاپ. هر دو تجربه بهینه‌سازی شده‌اند.",
  },
  {
    q: "اطلاعات فایل‌های ملکی من کجا ذخیره می‌شود؟",
    a: "تمام اطلاعات روی سرورهای ایران (IranServer) ذخیره می‌شود. هیچ داده‌ای به خارج از کشور ارسال نمی‌شود. اتصال هم‌چنین رمزگذاری HTTPS دارد.",
  },
  {
    q: "آیا می‌توانم چند مشاور به پنل اضافه کنم؟",
    a: "بله. در پلن رایگان تا ۱ کاربر، در پلن حرفه‌ای تا ۱۰ مشاور، و در پلن تیمی تعداد نامحدود مشاور می‌توانید اضافه کنید. هر مشاور با نام‌کاربری خودش وارد می‌شود و فایل‌های ثبت‌شده توسط او قابل ردیابی است.",
  },
  {
    q: "لینک اشتراک‌گذاری چطور کار می‌کند؟",
    a: "برای هر مشتری یک لینک منحصربه‌فرد با قیمت سفارشی ایجاد می‌کنید. مشتری بدون نیاز به ثبت‌نام لینک را باز می‌کند و عکس‌ها، موقعیت روی نقشه، و جزئیات ملک را می‌بیند. تعداد بازدیدهای هر لینک به شما نمایش داده می‌شود.",
  },
  {
    q: "آیا امکان اشتراک سالانه وجود دارد؟",
    a: "بله. با انتخاب اشتراک سالانه، معادل ۲ ماه رایگان دریافت می‌کنید. پرداخت از طریق درگاه زرین‌پال انجام می‌شود و فاکتور دریافت خواهید کرد.",
  },
  {
    q: "اگر اشتراکم تمام شود داده‌هایم حذف می‌شود؟",
    a: "خیر. داده‌های شما هرگز بدون درخواست شخصی حذف نمی‌شوند. پس از پایان اشتراک یک دوره ۷ روزه مهلت دارید، بعد از آن دسترسی به حالت فقط‌خواندنی تبدیل می‌شود تا زمانی که اشتراک تجدید کنید.",
  },
  {
    q: "چطور با پشتیبانی ارتباط بگیرم؟",
    a: "از طریق سیستم تیکت داخل پنل می‌توانید با تیم پشتیبانی ارتباط بگیرید. تیکت‌ها معمولاً ظرف ۴ تا ۸ ساعت در روزهای کاری پاسخ داده می‌شوند.",
  },
]

export function FaqSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  function toggle(i: number) {
    setOpenIndex((prev) => (prev === i ? null : i))
  }

  return (
    <section id="faq" className="py-20 px-6" style={{ background: "#F4F6F8" }}>
      <div className="container mx-auto max-w-3xl">
        <h2
          className="font-semibold text-center text-[var(--color-text-primary)] mb-3"
          style={{ fontSize: "clamp(1.75rem, 4vw, 2.375rem)" }}
        >
          سوالات متداول
        </h2>
        <p className="text-[var(--color-text-secondary)] text-center mb-12">
          اگر سوالی دارید که اینجا نیست، از طریق پشتیبانی با ما در تماس باشید.
        </p>

        <div className="space-y-3">
          {faqs.map((faq, i) => {
            const isOpen = openIndex === i
            return (
              <div
                key={i}
                className="rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-1)] overflow-hidden transition-all"
              >
                <button
                  onClick={() => toggle(i)}
                  className="flex w-full items-center justify-between gap-4 px-5 py-4 text-start"
                >
                  <span className="text-sm font-semibold text-[var(--color-text-primary)] leading-snug">
                    {faq.q}
                  </span>
                  <span
                    className="shrink-0 flex h-7 w-7 items-center justify-center rounded-lg transition-colors"
                    style={{
                      background: isOpen ? "var(--color-teal-50)" : "var(--color-surface-2)",
                      color: isOpen ? "var(--color-teal-600)" : "var(--color-text-tertiary)",
                    }}
                  >
                    {isOpen ? <Minus className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
                  </span>
                </button>
                {isOpen && (
                  <div className="px-5 pb-5 border-t border-[var(--color-border-subtle)]">
                    <p className="pt-4 text-sm text-[var(--color-text-secondary)] leading-relaxed">
                      {faq.a}
                    </p>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
