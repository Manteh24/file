import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function NotFound() {
  return (
    <div
      dir="rtl"
      className="min-h-screen flex items-center justify-center px-4"
      style={{ background: "var(--color-base)", color: "var(--color-text-primary)" }}
    >
      <div className="text-center space-y-6 max-w-md">
        <p
          className="text-7xl font-bold tracking-tight"
          style={{ color: "var(--color-teal-500)" }}
        >
          ۴۰۴
        </p>
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold">صفحه پیدا نشد</h1>
          <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
            صفحه‌ای که دنبالش بودید وجود ندارد یا منتقل شده است.
          </p>
        </div>
        <div className="flex items-center justify-center gap-3">
          <Button asChild>
            <Link href="/dashboard">بازگشت به داشبورد</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/">صفحه اصلی</Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
