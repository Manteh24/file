import { LandingNav } from "@/components/marketing/LandingNav"
import { LandingFooter } from "@/components/marketing/LandingFooter"
import { Users, Target, Heart, Zap } from "lucide-react"

export const metadata = { title: "درباره ما — املاکبین" }

const values = [
  {
    icon: Target,
    title: "تمرکز بر بازار ایران",
    desc: "از تقویم جلالی تا پرداخت زرین‌پال، هر چیزی که می‌بینید برای بازار ایران طراحی شده — نه ترجمه یک محصول خارجی.",
  },
  {
    icon: Zap,
    title: "سادگی در اولویت",
    desc: "مشاور باید وقتش را برای فروش بگذارد، نه یاد گرفتن نرم‌افزار. رابط کاربری ما طوری طراحی شده که در چند دقیقه شروع کنید.",
  },
  {
    icon: Users,
    title: "ساخته‌شده با دفاتر واقعی",
    desc: "هر ویژگی از بازخورد مستقیم مدیران دفاتر و مشاوران فعال شکل گرفته. ما گوش می‌دهیم، می‌سازیم، بهبود می‌دهیم.",
  },
  {
    icon: Heart,
    title: "اشتیاق به ساختن",
    desc: "تیم ما از توسعه‌دهندگانی تشکیل شده که واقعاً به بهتر کردن تجربه کار در دفاتر اعتقاد دارند.",
  },
]

export default function AboutPage() {
  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--color-base)" }} dir="rtl">
      <LandingNav />

      <main className="flex-1">
        {/* Hero */}
        <section className="py-20 px-6" style={{ background: "var(--color-surface-1)" }}>
          <div className="container mx-auto max-w-3xl text-center">
            <p className="text-sm font-semibold tracking-widest text-[var(--color-teal-500)] mb-4">
              درباره ما
            </p>
            <h1
              className="font-semibold text-[var(--color-text-primary)] leading-snug mb-5"
              style={{ fontSize: "clamp(1.75rem, 4vw, 2.75rem)" }}
            >
              ما سیستم مدیریت دفتر<br />
              <span className="text-[var(--color-teal-500)]">ساخته برای ایران</span> هستیم
            </h1>
            <p className="text-lg text-[var(--color-text-secondary)] leading-relaxed max-w-2xl mx-auto">
              املاکبین با یک هدف ساده شروع شد: ایجاد ابزاری که مشاوران و مدیران دفاتر بتوانند
              فایل‌های ملکی، مشتریان، و قراردادهایشان را بدون دردسر مدیریت کنند — به‌زبان فارسی
              و با درک عمیق از بازار ایران.
            </p>
          </div>
        </section>

        {/* Story */}
        <section className="py-20 px-6" style={{ background: "var(--color-base)" }}>
          <div className="container mx-auto max-w-3xl">
            <h2 className="text-2xl font-semibold text-[var(--color-text-primary)] mb-6">
              داستان ما
            </h2>
            <div className="space-y-5 text-[var(--color-text-secondary)] leading-relaxed text-base">
              <p>
                بازار مسکن ایران یکی از پویاترین و پیچیده‌ترین بازارها در منطقه است. هزاران دفتر
                مشاور املاک در سراسر کشور روزانه صدها فایل ملکی مدیریت می‌کنند — اما اکثر آن‌ها
                هنوز با اکسل، کاغذ، یا گروه‌های واتساپ کار می‌کنند.
              </p>
              <p>
                ما دیدیم که ابزارهای موجود یا خارجی هستند (و با بازار ایران ناسازگار)، یا
                پیچیده‌اند و برای یاد گرفتن نیاز به آموزش طولانی دارند. تصمیم گرفتیم چیزی
                بسازیم که واقعاً برای این بازار طراحی شده باشد.
              </p>
              <p>
                نتیجه: پلتفرمی که از ثبت فایل تا اشتراک‌گذاری با مشتری، از CRM تا گزارش مالی
                — همه در یک جا — با تقویم جلالی، فرمت تومان، و پشتیبانی از RTL.
              </p>
            </div>
          </div>
        </section>

        {/* Values */}
        <section className="py-20 px-6" style={{ background: "var(--color-surface-2)" }}>
          <div className="container mx-auto max-w-4xl">
            <h2 className="text-2xl font-semibold text-[var(--color-text-primary)] mb-10 text-center">
              ارزش‌های ما
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {values.map((v) => (
                <div
                  key={v.title}
                  className="rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-1)] p-6"
                >
                  <div
                    className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl"
                    style={{ background: "var(--color-teal-50)", color: "var(--color-teal-600)" }}
                  >
                    <v.icon className="h-5 w-5" />
                  </div>
                  <h3 className="text-base font-semibold text-[var(--color-text-primary)] mb-2">
                    {v.title}
                  </h3>
                  <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed">
                    {v.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <LandingFooter />
    </div>
  )
}
