import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import {
  FolderOpen,
  Users,
  Share2,
  FileText,
  MessageSquare,
  MapPin,
  Sparkles,
  ChevronLeft,
  CheckCircle2,
  Lightbulb,
  HelpCircle,
} from "lucide-react"
import { PageHeader } from "@/components/shared/PageHeader"

export default async function GuidePage() {
  const session = await auth()
  if (!session?.user) redirect("/login")

  return (
    <div className="mx-auto max-w-3xl space-y-10 px-0 md:px-4 pb-12">
      <PageHeader
        title="راهنمای استفاده"
        description="آموزش کامل کار با سامانه، نکات کاربردی و سوالات متداول"
      />

      {/* Quick start steps */}
      <section>
        <SectionTitle icon={<CheckCircle2 className="h-5 w-5" />} label="شروع سریع" />
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {QUICK_STEPS.map((step, i) => (
            <div
              key={i}
              className="flex gap-4 rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-1)] p-4"
            >
              <div
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-sm font-bold"
                style={{ background: "var(--color-teal-50)", color: "var(--color-teal-700)" }}
              >
                {(i + 1).toLocaleString("fa-IR")}
              </div>
              <div>
                <p className="text-sm font-semibold text-[var(--color-text-primary)]">{step.title}</p>
                <p className="mt-0.5 text-xs leading-relaxed text-[var(--color-text-secondary)]">
                  {step.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Feature guides */}
      <section>
        <SectionTitle icon={<FolderOpen className="h-5 w-5" />} label="آموزش ویژگی‌ها" />
        <div className="mt-4 space-y-3">
          {FEATURE_GUIDES.map((guide, i) => (
            <ExpandableGuide key={i} guide={guide} />
          ))}
        </div>
      </section>

      {/* Tips */}
      <section>
        <SectionTitle icon={<Lightbulb className="h-5 w-5" />} label="نکات و بهترین روش‌ها" />
        <div className="mt-4 space-y-2">
          {TIPS.map((tip, i) => (
            <div
              key={i}
              className="flex gap-3 rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-surface-1)] px-4 py-3"
            >
              <span className="mt-0.5 shrink-0 text-base" aria-hidden>
                {tip.emoji}
              </span>
              <div>
                <p className="text-sm font-medium text-[var(--color-text-primary)]">{tip.title}</p>
                <p className="mt-0.5 text-xs leading-relaxed text-[var(--color-text-secondary)]">
                  {tip.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section>
        <SectionTitle icon={<HelpCircle className="h-5 w-5" />} label="سوالات متداول" />
        <div className="mt-4 space-y-2">
          {FAQ.map((item, i) => (
            <ExpandableFaq key={i} item={item} />
          ))}
        </div>
      </section>

      {/* Support CTA */}
      <div
        className="flex flex-col items-center gap-3 rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-1)] px-6 py-8 text-center"
      >
        <div
          className="flex h-12 w-12 items-center justify-center rounded-full"
          style={{ background: "var(--color-teal-50)" }}
        >
          <MessageSquare className="h-6 w-6" style={{ color: "var(--color-teal-600)" }} />
        </div>
        <p className="text-base font-semibold text-[var(--color-text-primary)]">
          جواب سوالتان را پیدا نکردید؟
        </p>
        <p className="text-sm text-[var(--color-text-secondary)]">
          تیم پشتیبانی آماده پاسخگویی است. یک تیکت ثبت کنید تا در اسرع وقت پاسخ دهیم.
        </p>
        <a
          href="/support/new"
          className="mt-1 inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-medium text-white transition-colors"
          style={{ background: "var(--color-teal-600)" }}
        >
          ثبت درخواست پشتیبانی
          <ChevronLeft className="h-4 w-4 scale-x-[-1]" />
        </a>
      </div>
    </div>
  )
}

/* ─── Sub-components ────────────────────────────────────────────────────── */

function SectionTitle({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-2 border-b border-[var(--color-border-subtle)] pb-3">
      <span style={{ color: "var(--color-teal-600)" }}>{icon}</span>
      <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">{label}</h2>
    </div>
  )
}

function ExpandableGuide({ guide }: { guide: FeatureGuide }) {
  return (
    <details className="group rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-1)]">
      <summary className="flex cursor-pointer items-center gap-3 px-4 py-3.5 select-none list-none">
        <span
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
          style={{ background: "var(--color-teal-50)", color: "var(--color-teal-600)" }}
        >
          <guide.icon className="h-4 w-4" />
        </span>
        <span className="flex-1 text-sm font-medium text-[var(--color-text-primary)]">
          {guide.title}
        </span>
        <ChevronLeft className="h-4 w-4 shrink-0 text-[var(--color-text-tertiary)] transition-transform duration-200 group-open:-rotate-90" />
      </summary>
      <div className="border-t border-[var(--color-border-subtle)] px-4 pb-4 pt-3">
        <ol className="space-y-2">
          {guide.steps.map((step, i) => (
            <li key={i} className="flex gap-2.5 text-sm text-[var(--color-text-secondary)]">
              <span
                className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white"
                style={{ background: "var(--color-teal-500)" }}
              >
                {(i + 1).toLocaleString("fa-IR")}
              </span>
              {step}
            </li>
          ))}
        </ol>
      </div>
    </details>
  )
}

function ExpandableFaq({ item }: { item: FaqItem }) {
  return (
    <details className="group rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-1)]">
      <summary className="flex cursor-pointer items-center gap-3 px-4 py-3.5 select-none list-none">
        <span className="flex-1 text-sm font-medium text-[var(--color-text-primary)]">
          {item.q}
        </span>
        <ChevronLeft className="h-4 w-4 shrink-0 text-[var(--color-text-tertiary)] transition-transform duration-200 group-open:-rotate-90" />
      </summary>
      <div className="border-t border-[var(--color-border-subtle)] px-4 pb-4 pt-3">
        <p className="text-sm leading-relaxed text-[var(--color-text-secondary)]">{item.a}</p>
      </div>
    </details>
  )
}

/* ─── Content data ──────────────────────────────────────────────────────── */

const QUICK_STEPS = [
  {
    title: "پروفایل خود را کامل کنید",
    desc: "تصویر پروفایل و اطلاعات تماس خود را در بخش «پروفایل من» ثبت کنید تا مشتریان به شما اعتماد بیشتری داشته باشند.",
  },
  {
    title: "اولین فایل ملکی را ثبت کنید",
    desc: "از بخش «فایل‌ها» روی «فایل جدید» کلیک کنید. نوع معامله، موقعیت روی نقشه، و یک شماره تماس کافی است.",
  },
  {
    title: "لینک اشتراک‌گذاری بسازید",
    desc: "درون فایل، «ارسال به مشتری» را بزنید. یک لینک اختصاصی با قیمت دلخواه ساخته می‌شود که مستقیم پیامک می‌شود.",
  },
  {
    title: "مشتریان را در CRM ثبت کنید",
    desc: "از بخش «مشتریان» افراد جدید را اضافه کنید و تاریخچه تماس‌ها را مدیریت کنید.",
  },
]

interface FeatureGuide {
  title: string
  icon: React.ElementType
  steps: string[]
}

interface FaqItem {
  q: string
  a: string
}

const FEATURE_GUIDES: FeatureGuide[] = [
  {
    title: "مدیریت فایل‌های ملکی",
    icon: FolderOpen,
    steps: [
      "از منوی کناری روی «فایل‌ها» کلیک کنید.",
      "دکمه «فایل جدید» را بزنید و نوع معامله (فروش یا اجاره) را انتخاب کنید.",
      "موقعیت ملک را روی نقشه با یک ضربه مشخص کنید؛ آدرس خودکار پر می‌شود.",
      "اطلاعات قیمت، متراژ، و مشخصات ملک را وارد کنید — همه اختیاری است جز موقعیت و یک شماره تماس.",
      "تصاویر را بارگذاری کنید؛ سامانه واترمارک دفتر را خودکار اضافه می‌کند.",
      "روی «ذخیره» کلیک کنید. فایل بلافاصله در پنل مدیر نمایش داده می‌شود.",
    ],
  },
  {
    title: "اشتراک‌گذاری فایل با مشتری",
    icon: Share2,
    steps: [
      "صفحه جزئیات فایل را باز کنید.",
      "روی «ارسال به مشتری» کلیک کنید.",
      "شماره موبایل مشتری را وارد کنید یا از لیست CRM انتخاب کنید.",
      "در صورت نیاز قیمت خاص برای این مشتری را وارد کنید (قیمت روی فایل اصلی تغییر نمی‌کند).",
      "پیامک ارسال می‌شود و لینک اختصاصی آن مشتری ساخته می‌شود.",
      "تعداد بازدید هر لینک را در پنل مشاهده کنید.",
    ],
  },
  {
    title: "مدیریت مشاوران (مدیران دفتر)",
    icon: Users,
    steps: [
      "از منو به بخش «مشاوران» بروید.",
      "«افزودن مشاور» را بزنید و اطلاعات کاربری مشاور را وارد کنید.",
      "مشاور با نام کاربری و رمز انتخابی وارد می‌شود و فایل‌های تخصیص‌یافته را می‌بیند.",
      "برای تخصیص فایل به مشاور، از صفحه جزئیات فایل بخش «مشاوران» را ویرایش کنید.",
      "برای غیرفعال کردن موقت مشاور، دکمه «غیرفعال» را در صفحه مشاور بزنید.",
    ],
  },
  {
    title: "تولید توضیحات با هوش مصنوعی",
    icon: Sparkles,
    steps: [
      "در فرم ثبت یا ویرایش فایل، اطلاعات ملک را پر کنید.",
      "دکمه «تولید توضیحات» را بزنید.",
      "لحن مناسب (رسمی / معمولی / جذاب) را انتخاب کنید.",
      "متن پیشنهادی ظرف چند ثانیه آماده می‌شود.",
      "توضیحات را مستقیم ویرایش کنید و ذخیره نمایید.",
    ],
  },
  {
    title: "استفاده از نقشه و موقعیت ملک",
    icon: MapPin,
    steps: [
      "در فرم فایل، روی «انتخاب موقعیت روی نقشه» کلیک کنید.",
      "روی محل دقیق ملک در نقشه ضربه بزنید تا پین قرار گیرد.",
      "آدرس خودکار از نقشه نشان دریافت می‌شود.",
      "پس از ذخیره، اطلاعات دسترسی به حمل‌ونقل عمومی و مکان‌های اطراف تحلیل می‌شود.",
      "این اطلاعات در صفحه اشتراک‌گذاری با مشتری نمایش داده می‌شود.",
    ],
  },
  {
    title: "ثبت قرارداد و بستن پرونده",
    icon: FileText,
    steps: [
      "پس از توافق با مشتری، به صفحه فایل بروید.",
      "«ثبت قرارداد» را بزنید و نوع معامله (فروش / اجاره) را تایید کنید.",
      "مبلغ معامله و کمیسیون را وارد کنید.",
      "پس از ذخیره، وضعیت فایل به «فروخته شده» یا «اجاره داده شده» تغییر می‌کند.",
      "همه لینک‌های اشتراک‌گذاری این فایل خودکار غیرفعال می‌شوند.",
    ],
  },
]

const TIPS = [
  {
    emoji: "📸",
    title: "تصاویر با کیفیت، فروش سریع‌تر",
    desc: "فایل‌هایی با بیش از ۵ تصویر روشن و عریض، معمولاً ۳ برابر سریع‌تر به نتیجه می‌رسند. از فضای روز و نور طبیعی استفاده کنید.",
  },
  {
    emoji: "😊",
    title: "تصویر پروفایل واقعی اعتماد می‌سازد",
    desc: "مشتریانی که پروفایل مشاور را می‌بینند با احتمال بیشتری پاسخ می‌دهند. یک تصویر واضح با لبخند کافی است.",
  },
  {
    emoji: "💬",
    title: "توضیحات جذاب را به هوش مصنوعی بسپارید",
    desc: "لحن «جذاب» برای بازار اجاره و لحن «رسمی» برای فروش‌های بزرگ مناسب‌تر است. همیشه نتیجه را یک‌بار بخوانید و ویرایش کنید.",
  },
  {
    emoji: "🔗",
    title: "برای هر مشتری لینک جداگانه بسازید",
    desc: "با لینک اختصاصی می‌توانید قیمت متفاوت نمایش دهید و تعداد بازدید هر مشتری را جداگانه رهگیری کنید.",
  },
  {
    emoji: "📋",
    title: "CRM را به‌روز نگه دارید",
    desc: "ثبت یادداشت پس از هر تماس، در جلسه بعدی خیلی کمک می‌کند. مشتری احساس می‌کند فردی است و فراموشش نشده‌اید.",
  },
  {
    emoji: "⚡",
    title: "پاسخ سریع، کلید موفقیت",
    desc: "مشتریانی که لینک فایل را باز می‌کنند معمولاً در همان روز تصمیم می‌گیرند. اعلان‌های پنل را روشن نگه دارید.",
  },
]

const FAQ: FaqItem[] = [
  {
    q: "حداقل اطلاعات لازم برای ثبت فایل چیست؟",
    a: "تنها نوع معامله (فروش یا اجاره)، موقعیت روی نقشه، و یک شماره تماس الزامی است. بقیه اطلاعات اختیاری‌اند و می‌توانید بعداً تکمیل کنید.",
  },
  {
    q: "آیا مشتری می‌تواند قیمت واقعی را ببیند؟",
    a: "نه — هنگام ساخت لینک اشتراک‌گذاری می‌توانید قیمت خاصی برای هر مشتری تعیین کنید. قیمت روی فایل اصلی تغییر نمی‌کند و مشتری‌های مختلف قیمت‌های متفاوتی می‌بینند.",
  },
  {
    q: "چرا نقشه در حالت آفلاین کار نمی‌کند؟",
    a: "نقشه نشان نیاز به اتصال اینترنت دارد. در صورت قطع اتصال، فرم به‌صورت پیش‌نویس ذخیره می‌شود تا پس از اتصال مجدد آپلود شود.",
  },
  {
    q: "پیش‌نویس فایل کجا ذخیره می‌شود؟",
    a: "پیش‌نویس‌ها در حافظه محلی مرورگر (IndexedDB) ذخیره می‌شوند. اگر برگه مرورگر را ببندید یا اینترنت قطع شود، اطلاعات از دست نمی‌رود و دفعه بعد که فرم را باز کنید بازیابی می‌شود.",
  },
  {
    q: "آیا مشاور می‌تواند همه فایل‌ها را ببیند؟",
    a: "مشاور فقط فایل‌هایی را می‌بیند که مدیر به او تخصیص داده است. مدیر دسترسی به همه فایل‌های دفتر دارد.",
  },
  {
    q: "چگونه رمز عبور خود را بازیابی کنم؟",
    a: "در صفحه ورود روی «فراموشی رمز» کلیک کنید. کد بازیابی به شماره موبایلی که در پروفایل ثبت کرده‌اید ارسال می‌شود. اگر شماره ثبت نکرده‌اید، از طریق تیکت پشتیبانی اقدام کنید.",
  },
  {
    q: "بعد از ثبت قرارداد چه اتفاقی می‌افتد؟",
    a: "وضعیت فایل به فروخته‌شده یا اجاره‌داده‌شده تغییر می‌کند، تمام لینک‌های اشتراک‌گذاری آن فایل غیرفعال می‌شوند، و سابقه قرارداد در بخش «قراردادها» ثبت می‌شود.",
  },
  {
    q: "محدودیت پلن رایگان چیست؟",
    a: "پلن رایگان شامل تعداد محدودی فایل، کاربر، و درخواست هوش مصنوعی در ماه است. برای جزئیات دقیق، به بخش «تنظیمات ← اشتراک» مراجعه کنید.",
  },
  {
    q: "آیا داده‌ها بعد از انقضای اشتراک حذف می‌شوند؟",
    a: "خیر — داده‌های شما هرگز به‌صورت خودکار حذف نمی‌شوند. بعد از انقضا ۷ روز فرصت تمدید دارید و پس از آن دسترسی محدود می‌شود، اما اطلاعات کاملاً باقی می‌ماند.",
  },
]
