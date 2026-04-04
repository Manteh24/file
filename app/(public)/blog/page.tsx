import { LandingNav } from "@/components/marketing/LandingNav"
import { LandingFooter } from "@/components/marketing/LandingFooter"
import { BookOpen } from "lucide-react"

export const metadata = { title: "بلاگ — املاکبین" }

export default function BlogPage() {
  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--color-base)" }} dir="rtl">
      <LandingNav />

      <main className="flex-1 flex items-center justify-center px-6 py-24">
        <div className="text-center max-w-md">
          <div
            className="mx-auto mb-6 inline-flex h-16 w-16 items-center justify-center rounded-2xl"
            style={{ background: "var(--color-teal-50)", color: "var(--color-teal-600)" }}
          >
            <BookOpen className="h-7 w-7" />
          </div>
          <h1 className="text-2xl font-semibold text-[var(--color-text-primary)] mb-3">
            بلاگ به‌زودی می‌آید
          </h1>
          <p className="text-[var(--color-text-secondary)] leading-relaxed mb-8">
            ما داریم مقالات و راهنماهایی درباره مدیریت دفتر،
            نکات فروش ملک، و بهترین‌های استفاده از امکانات پلتفرم می‌نویسیم.
            به‌زودی اینجا منتشر می‌شود.
          </p>
          <a
            href="/"
            className="inline-flex h-10 items-center justify-center rounded-lg px-6 text-sm font-semibold text-white transition-colors hover:opacity-90"
            style={{ background: "var(--color-teal-500)" }}
          >
            بازگشت به صفحه اصلی
          </a>
        </div>
      </main>

      <LandingFooter />
    </div>
  )
}
