import { LandingNav } from "@/components/marketing/LandingNav"
import { LandingFooter } from "@/components/marketing/LandingFooter"

export const metadata = { title: "شرایط استفاده — املاکبین" }

const sections = [
  {
    title: "پذیرش شرایط",
    body: `با ثبت‌نام و استفاده از خدمات املاکبین، شرایط زیر را می‌پذیرید. اگر با هر بخشی موافق نیستید، لطفاً از استفاده از سرویس خودداری کنید.`,
  },
  {
    title: "شرح خدمات",
    body: `املاکبین یک پلتفرم SaaS برای مدیریت دفاتر مشاور املاک است. ما امکان ثبت فایل، مدیریت مشتری، اشتراک‌گذاری لینک ملک، ثبت قرارداد، و گزارش‌گیری مالی را فراهم می‌کنیم. خدمات به‌صورت ابری و با اشتراک ماهانه یا سالانه ارائه می‌شود.`,
  },
  {
    title: "تعهدات کاربر",
    body: `کاربران متعهد می‌شوند:
• اطلاعات صحیح و به‌روز در سیستم ثبت کنند
• از حساب تنها برای مقاصد قانونی استفاده کنند
• اطلاعات ورود را محرمانه نگه دارند
• محتوای توهین‌آمیز، غیرقانونی، یا گمراه‌کننده وارد نکنند
• از روش‌هایی که به سرویس آسیب می‌زند (مانند bot یا scraping) استفاده نکنند`,
  },
  {
    title: "اشتراک و پرداخت",
    body: `دوره آزمایشی رایگان ۳۰ روزه است. پس از آن، ادامه استفاده نیاز به خرید اشتراک دارد. پرداخت‌ها از طریق زرین‌پال انجام می‌شود. اشتراک خریداری‌شده قابل استرداد نیست مگر در موارد نقص فنی اثبات‌شده. قیمت‌ها می‌توانند تغییر کنند — تغییرات پیش از اعمال اطلاع‌رسانی می‌شود.`,
  },
  {
    title: "مالکیت داده",
    body: `تمام داده‌هایی که وارد سیستم می‌کنید (فایل‌های ملک، مشتریان، قراردادها) متعلق به شماست. ما صرفاً ذخیره‌سازی و پردازش می‌کنیم. در صورت لغو اشتراک، می‌توانید درخواست صدور خروجی داده‌هایتان را داشته باشید.`,
  },
  {
    title: "محدودیت مسئولیت",
    body: `ما تلاش می‌کنیم سرویس پایدار و بدون خرابی ارائه دهیم اما ۱۰۰٪ uptime را تضمین نمی‌کنیم. در مواردی مانند خرابی زیرساخت، حملات سایبری، یا اتفاقات خارج از کنترل، مسئولیتی برای خسارت غیرمستقیم نداریم.`,
  },
  {
    title: "تغییر در شرایط",
    body: `ما می‌توانیم این شرایط را به‌روزرسانی کنیم. در صورت تغییر مهم، از طریق ایمیل یا اطلاعیه درون‌برنامه‌ای اطلاع‌رسانی می‌کنیم. استفاده از سرویس پس از اطلاع‌رسانی به معنای پذیرش تغییرات است.`,
  },
  {
    title: "قانون حاکم",
    body: `این شرایط تابع قوانین جمهوری اسلامی ایران است. هرگونه اختلاف از طریق مذاکره یا در صورت لزوم از طریق مراجع قضایی ایران حل‌وفصل خواهد شد.`,
  },
]

export default function TermsPage() {
  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--color-base)" }} dir="rtl">
      <LandingNav />

      <main className="flex-1">
        <section className="py-20 px-6" style={{ background: "var(--color-surface-1)" }}>
          <div className="container mx-auto max-w-2xl text-center">
            <p className="text-sm font-semibold tracking-widest text-[var(--color-teal-500)] mb-4">
              قوانین و مقررات
            </p>
            <h1
              className="font-semibold text-[var(--color-text-primary)] mb-4"
              style={{ fontSize: "clamp(1.75rem, 4vw, 2.5rem)" }}
            >
              شرایط استفاده از خدمات
            </h1>
            <p className="text-[var(--color-text-tertiary)] text-sm">
              آخرین به‌روزرسانی: فروردین ۱۴۰۴
            </p>
          </div>
        </section>

        <section className="py-16 px-6" style={{ background: "var(--color-base)" }}>
          <div className="container mx-auto max-w-2xl">
            <div className="space-y-10">
              {sections.map((s, i) => (
                <div key={s.title}>
                  <h2 className="text-lg font-semibold text-[var(--color-text-primary)] mb-3">
                    <span className="text-[var(--color-teal-500)] ml-2">{i + 1}.</span>
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
