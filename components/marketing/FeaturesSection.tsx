import { BarChart2, Building2, Camera, FolderOpen, Link2, MapPin, MessageSquare, Sparkles, Users } from "lucide-react"

const mockFiles = [
  {
    title: "آپارتمان ونک",
    meta: "۱۸۰ متر · ۳ خواب",
    price: "۱۵,۵۰۰,۰۰۰,۰۰۰ تومان",
    active: true,
  },
  {
    title: "ویلا لواسان",
    meta: "۴۵۰ متر · ۵ خواب",
    price: "۳۸,۰۰۰,۰۰۰,۰۰۰ تومان",
    active: false,
  },
  {
    title: "اداری جردن",
    meta: "۱۱۰ متر · تجاری",
    price: "اجاره ماهانه: ۲۰,۰۰۰,۰۰۰",
    active: true,
  },
]

const smallFeatures = [
  {
    icon: Link2,
    title: "لینک با قیمت اختصاصی",
    description: "برای هر مشتری لینک جداگانه با قیمت سفارشی بسازید",
  },
  {
    icon: MapPin,
    title: "تحلیل موقعیت مکانی",
    description: "بررسی دسترسی‌ها و امکانات محله",
    badge: "حرفه‌ای+",
  },
  {
    icon: MessageSquare,
    title: "پیامک",
    description: "قالب‌های آماده برای ارسال به مشتریان",
  },
  {
    icon: Sparkles,
    title: "توضیحات با هوش مصنوعی",
    description: "متن حرفه‌ای ملک در چند ثانیه",
  },
  {
    icon: Users,
    title: "مدیریت مشتریان (CRM)",
    description: "تاریخچه تماس و پیگیری معاملات",
  },
  {
    icon: BarChart2,
    title: "گزارش‌های عملکرد",
    description: "تحلیل درآمد، عملکرد مشاوران و تصمیم‌گیری آگاهانه — با امکان تعیین هدف در پلن تیم",
    badge: "حرفه‌ای+",
  },
  {
    icon: Camera,
    title: "بهبود عکس‌ها و واترمارک لوگو",
    description: "کیفیت تصاویر به‌صورت خودکار بهبود می‌یابد و لوگوی دفتر روی عکس‌ها چاپ می‌شود",
    badge: "حرفه‌ای+",
  },
  {
    icon: Building2,
    title: "چند شعبه",
    description: "مدیریت چند شعبه یا تیم فروش در یک پنل مشترک",
    badge: "تیم",
  },
]

export function FeaturesSection() {
  return (
    <section id="features" className="py-20 px-6" style={{ background: "#EEF9F6" }}>
      <div className="container mx-auto max-w-5xl">
        <h2
          className="font-semibold text-center text-[var(--color-text-primary)] mb-3"
          style={{ fontSize: "clamp(1.75rem, 4vw, 2.375rem)" }}
        >
          همه ابزارهای دفتر در یک جا
        </h2>
        <p className="text-[var(--color-text-secondary)] text-center mb-12">
          طراحی شده برای مشاوران و مدیران دفاتر املاک
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* ── Large hero card: File Management ─────────────────────────── */}
          <div className="md:col-span-2 md:row-span-2 rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-1)] p-6 flex flex-col transition-all duration-300 hover:border-[var(--color-teal-300)] hover:-translate-y-0.5 hover:shadow-md shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--color-teal-50)]">
                <FolderOpen className="h-5 w-5 text-[var(--color-teal-500)]" />
              </div>
              <div>
                <h3 className="font-semibold text-[var(--color-text-primary)]">مدیریت فایل‌های ملک</h3>
                <p className="text-[var(--color-text-tertiary)] text-xs mt-0.5">ثبت، ویرایش و پیگیری با لاگ تغییرات</p>
              </div>
            </div>

            {/* Mock file list */}
            <div className="flex-1 space-y-2.5 mt-2">
              {mockFiles.map((file) => (
                <div
                  key={file.title}
                  className="flex items-center justify-between rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-2)] px-4 py-3"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`h-2 w-2 rounded-full shrink-0 ${
                        file.active ? "bg-[var(--color-teal-500)]" : "bg-[var(--color-surface-4)]"
                      }`}
                    />
                    <div>
                      <p className="text-sm font-semibold text-[var(--color-text-primary)]">{file.title}</p>
                      <p className="text-xs text-[var(--color-text-tertiary)]">{file.meta}</p>
                    </div>
                  </div>
                  <p className="hidden sm:block text-xs text-[var(--color-teal-600)] font-semibold">{file.price}</p>
                </div>
              ))}
            </div>
          </div>

          {/* ── Small feature cards ──────────────────────────────────────── */}
          {smallFeatures.map((feature) => {
            const Icon = feature.icon
            return (
              <div
                key={feature.title}
                className="rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-1)] p-5 flex flex-col min-h-[140px] transition-all duration-300 hover:border-[var(--color-teal-300)] hover:-translate-y-0.5 hover:shadow-md shadow-sm"
              >
                <div className="flex items-center gap-2 mb-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--color-teal-50)]">
                    <Icon className="h-[18px] w-[18px] text-[var(--color-teal-500)]" />
                  </div>
                  {"badge" in feature && feature.badge && (
                    <span className="rounded-full bg-[var(--color-teal-50)] border border-[var(--color-teal-200)] px-2 py-0.5 text-[10px] font-semibold text-[var(--color-teal-600)]">
                      {feature.badge}
                    </span>
                  )}
                </div>
                <h3 className="font-semibold text-[var(--color-text-primary)] text-sm mb-1.5">{feature.title}</h3>
                <p className="text-[var(--color-text-secondary)] text-xs leading-relaxed">{feature.description}</p>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
