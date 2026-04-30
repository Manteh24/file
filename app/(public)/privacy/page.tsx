import { LandingNav } from "@/components/marketing/LandingNav"
import { LandingFooter } from "@/components/marketing/LandingFooter"

export const metadata = { title: "حریم خصوصی — املاک‌بین" }

const sections = [
  {
    title: "اطلاعاتی که جمع‌آوری می‌کنیم",
    body: `برای ارائه خدمات، اطلاعات زیر را از شما دریافت می‌کنیم:
• نام، ایمیل، و شماره موبایل (هنگام ثبت‌نام)
• نام دفتر و شهر فعالیت
• اطلاعات ملک‌ها، مشتریان، و قراردادهایی که در سیستم وارد می‌کنید
• لاگ‌های دسترسی برای امنیت حساب`,
  },
  {
    title: "نحوه استفاده از اطلاعات",
    body: `اطلاعات شما صرفاً برای موارد زیر استفاده می‌شود:
• ارائه و بهبود خدمات نرم‌افزار
• ارسال اطلاعیه‌های ضروری مانند اتمام اشتراک
• پاسخگویی به درخواست‌های پشتیبانی
• حفاظت از امنیت حساب کاربری

اطلاعات شما هرگز به اشخاص ثالث فروخته یا اجاره داده نمی‌شود.`,
  },
  {
    title: "ذخیره‌سازی و امنیت",
    body: `اطلاعات شما روی سرورهای ایران‌سرور (داخل ایران) ذخیره می‌شود. از رمزنگاری SSL برای انتقال داده و bcrypt برای ذخیره رمز عبور استفاده می‌کنیم. دسترسی به داده‌ها محدود به کارکنان مجاز است.`,
  },
  {
    title: "حقوق شما",
    body: `شما می‌توانید در هر زمان:
• درخواست مشاهده داده‌های ذخیره‌شده خود را داشته باشید
• درخواست اصلاح اطلاعات نادرست بدهید
• درخواست حذف حساب و داده‌هایتان را از طریق پشتیبانی ثبت کنید

برای هر یک از موارد فوق با ما از طریق support@amlakbin.com در ارتباط باشید.`,
  },
  {
    title: "کوکی‌ها",
    body: `ما از کوکی‌های ضروری برای نگهداری نشست کاربری استفاده می‌کنیم. این کوکی‌ها httpOnly هستند و قابل دسترسی از JavaScript نیستند. ما از کوکی‌های ردیابی یا تبلیغاتی استفاده نمی‌کنیم.`,
  },
  {
    title: "تغییر در سیاست حریم خصوصی",
    body: `در صورت تغییر مهم در این سیاست، از طریق ایمیل یا اطلاعیه درون‌برنامه‌ای شما را مطلع می‌کنیم. استفاده از سرویس پس از اطلاع‌رسانی به معنای پذیرش تغییرات است.`,
  },
]

export default function PrivacyPage() {
  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--color-base)" }} dir="rtl">
      <LandingNav />

      <main className="flex-1">
        <section className="py-20 px-6" style={{ background: "var(--color-surface-1)" }}>
          <div className="container mx-auto max-w-2xl text-center">
            <p className="text-sm font-semibold tracking-widest text-[var(--color-teal-500)] mb-4">
              حریم خصوصی
            </p>
            <h1
              className="font-semibold text-[var(--color-text-primary)] mb-4"
              style={{ fontSize: "clamp(1.75rem, 4vw, 2.5rem)" }}
            >
              سیاست حریم خصوصی
            </h1>
            <p className="text-[var(--color-text-tertiary)] text-sm">
              آخرین به‌روزرسانی: فروردین ۱۴۰۴
            </p>
          </div>
        </section>

        <section className="py-16 px-6" style={{ background: "var(--color-base)" }}>
          <div className="container mx-auto max-w-2xl">
            <div className="space-y-10">
              {sections.map((s) => (
                <div key={s.title}>
                  <h2 className="text-lg font-semibold text-[var(--color-text-primary)] mb-3">
                    {s.title}
                  </h2>
                  <p className="text-[var(--color-text-secondary)] text-sm leading-loose whitespace-pre-line">
                    {s.body}
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
