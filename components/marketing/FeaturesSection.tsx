import { FolderOpen, Link2, MapPin, MessageSquare, Sparkles, Users } from "lucide-react"

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
    title: "نقشه‌یابی با نشان",
    description: "موقعیت ملک و دسترسی‌ها روی نقشه ایرانی",
  },
  {
    icon: MessageSquare,
    title: "پیامک کاوه‌نگار",
    description: "قالب‌های آماده فارسی برای مشتریان",
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
]

export function FeaturesSection() {
  return (
    <section className="py-20 px-6 bg-[#0F1923]">
      <div className="container mx-auto max-w-5xl">
        <h2 className="text-3xl font-bold text-center text-[#F1F5F9] mb-3">
          همه ابزارهای دفتر در یک جا
        </h2>
        <p className="text-[#94A3B8] text-center mb-12">
          طراحی شده برای مشاورین و مدیران دفاتر ایرانی
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* ── Large hero card: File Management ─────────────────────────── */}
          <div className="md:col-span-2 md:row-span-2 rounded-2xl border border-white/8 bg-[#162332]/70 backdrop-blur-xl p-6 flex flex-col transition-colors duration-300 hover:border-[rgba(20,184,166,0.3)]">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#14B8A6]/10">
                <FolderOpen className="h-5 w-5 text-[#14B8A6]" />
              </div>
              <div>
                <h3 className="font-semibold text-[#F1F5F9]">مدیریت فایل‌های ملک</h3>
                <p className="text-[#94A3B8] text-xs mt-0.5">ثبت، ویرایش و پیگیری با لاگ تغییرات</p>
              </div>
            </div>

            {/* Mock file list */}
            <div className="flex-1 space-y-2.5 mt-2">
              {mockFiles.map((file) => (
                <div
                  key={file.title}
                  className="flex items-center justify-between rounded-xl border border-white/5 bg-[#0F1923]/60 px-4 py-3"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`h-2 w-2 rounded-full shrink-0 ${
                        file.active ? "bg-[#14B8A6]" : "bg-[#475569]"
                      }`}
                    />
                    <div>
                      <p className="text-sm font-medium text-[#F1F5F9]">{file.title}</p>
                      <p className="text-xs text-[#94A3B8]">{file.meta}</p>
                    </div>
                  </div>
                  <p className="hidden sm:block text-xs text-[#14B8A6] font-medium">{file.price}</p>
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
                className="rounded-2xl border border-white/8 bg-[#162332]/70 backdrop-blur-xl p-5 flex flex-col min-h-[140px] transition-colors duration-300 hover:border-[rgba(20,184,166,0.3)]"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#14B8A6]/10 mb-3">
                  <Icon className="h-[18px] w-[18px] text-[#14B8A6]" />
                </div>
                <h3 className="font-semibold text-[#F1F5F9] text-sm mb-1.5">{feature.title}</h3>
                <p className="text-[#94A3B8] text-xs leading-relaxed">{feature.description}</p>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
